'use strict'

const fp = require('fastify-plugin')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')

module.exports = fp(async function (fastify, opts) {
  // Helper function to get the appropriate API key based on country code
  const getWiseApiKey = (countryCode) => {
    const apiKeyName = `WISE_API_KEY_${countryCode.toUpperCase()}`
    const apiKey = fastify.config[apiKeyName]
    return apiKey
  }

  // Existing sendMoneyToTechnician function
  fastify.decorate('sendMoneyToTechnician', async function (technicianId, amount, reference = null) {
    try {
      // Step 1: Get the default Wise user details for the technician
      const wiseUser = await fastify.prisma.wise_users.findFirst({
        where: {
          technician_uuid: technicianId,
          is_default: true,
          deleted_at: null
        }
      })

      // Step 2: Get technician details for additional context
      const technician = await fastify.prisma.technicians.findUnique({
        where: {
          uuid: technicianId
        }
      })

      if (!technician) {
        throw new Error(`Technician not found: ${technicianId}`)
      }

      // Get the appropriate API key based on country code
      const apiKey = getWiseApiKey(wiseUser.country_code)

      // Step 3: Create quote
      const quoteResponse = await fastify.axios.post(
        `${fastify.config.WISE_API_URL}/v2/quotes`,
        {
          sourceCurrency: wiseUser.currency || 'AUD',
          targetCurrency: wiseUser.currency || 'AUD',
          sourceAmount: amount,
          profile: wiseUser.profile,
          payOut: "BANK_TRANSFER"
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      const quote = quoteResponse.data

      // Step 4: Create transfer
      const transferResponse = await fastify.axios.post(
        `${fastify.config.WISE_API_URL}/v1/transfers`,
        {
          targetAccount: wiseUser.wise_id,
          quoteUuid: quote.id,
          customerTransactionId: uuidv4(),
          details: {
            reference: reference || `Payment to ${wiseUser.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      const transfer = transferResponse.data

      // Step 5: Fund the transfer
      const fundResponse = await fastify.axios.post(
        `${fastify.config.WISE_API_URL}/v3/profiles/${wiseUser.profile}/transfers/${transfer.id}/payments`,
        {
          type: "BALANCE"
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      // Step 6: Create transaction record (you'll need to create this table)
      const transactionData = {
        uuid: uuidv4(),
        technician_uuid: technicianId,
        wise_user_uuid: wiseUser.uuid,
        wise_transfer_id: transfer.id,
        wise_quote_id: quote.id,
        amount: amount,
        currency: wiseUser.currency || 'AUD',
        reference: reference || `Payment to ${wiseUser.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
        status: transfer.status,
        created_at: moment().toISOString(),
        modified_at: moment().toISOString(),
      }

      // Store transaction record (uncomment when you create the table)
      await fastify.prisma.wise_transactions.create({
        data: transactionData
      })

      return {
        success: true,
        message: `Payment sent successfully to ${wiseUser.name}`,
        data: {
          transferId: transfer.id,
          quoteId: quote.id,
          technicianId: technicianId,
          technicianName: technician.name || wiseUser.name,
          recipientName: wiseUser.name,
          amount: amount,
          currency: wiseUser.currency || 'AUD',
          status: transfer.status,
          reference: reference || `Payment to ${wiseUser.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
          estimatedDelivery: quote.deliveryEstimate,
          fundingStatus: fundResponse.data,
          countryCode: wiseUser.country_code // Added for debugging/tracking
        }
      }

    } catch (error) {
      fastify.log.error('Send money to technician error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.errors?.[0]?.message || error.message || 'Failed to send money to technician')
    }
  })

  // NEW: Transfer deal amount to all jars based on their percentages
  fastify.decorate('transferDealToJars', async function (dealUuid, dealAmount, countryCode, reference = null, forceTransfer = false) {
    try {
      // Step 1: Check if transfers have already been completed for this deal
      if (!forceTransfer) {
        const existingTransfers = await fastify.prisma.wise_jar_transactions.findMany({
          where: {
            deal_uuid: dealUuid,
            deleted_at: null,
            status: {
              in: ['COMPLETED', 'PENDING', 'PROCESSING']
            }
          },
          include: {
            wise_jars: {
              select: {
                name: true,
                currency: true
              }
            }
          }
        })

        if (existingTransfers.length > 0) {
          const totalTransferred = existingTransfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
          
          return {
            success: false,
            alreadyTransferred: true,
            message: `Deal has already been transferred to jars. Total amount: ${totalTransferred}`,
            existingTransfers: existingTransfers.map(t => ({
              jarId: t.wise_jar_uuid,
              jarName: t.wise_jars?.name,
              amount: t.amount,
              currency: t.currency,
              status: t.status,
              transferId: t.wise_transfer_id,
              createdAt: t.created_at,
              reference: t.reference
            })),
            totalTransferred: totalTransferred,
            transferCount: existingTransfers.length
          }
        }
      }

      // Step 2: Get all active jars for the country with transfer percentages
      const jars = await fastify.prisma.wise_jars.findMany({
        where: {
          country_code: countryCode,
          deleted_at: null,
          transfer_percent: {
            not: null,
            gt: 0
          }
        },
        select: {
          id: true,
          uuid: true,
          wise_balance_id: true,
          profile: true,
          name: true,
          currency: true,
          transfer_percent: true,
          country_code: true,
        }
      })

      if (jars.length === 0) {
        throw new Error(`No jars found with transfer percentages for country: ${countryCode}`)
      }

      // Step 3: Validate total percentages don't exceed 100%
      const totalPercentage = jars.reduce((sum, jar) => sum + parseFloat(jar.transfer_percent || 0), 0)
      if (totalPercentage > 100) {
        throw new Error(`Total jar percentages (${totalPercentage}%) exceed 100%`)
      }

      // Step 4: Get the appropriate API key
      const apiKey = getWiseApiKey(countryCode)
      if (!apiKey) {
        throw new Error(`No API key found for country: ${countryCode}`)
      }

      // Step 5: Calculate amounts and process transfers
      const transfers = []
      let totalTransferred = 0

      for (const jar of jars) {
        const transferAmount = Math.round((dealAmount * parseFloat(jar.transfer_percent) / 100) * 100) / 100 // Round to 2 decimal places
        
        if (transferAmount <= 0) {
          continue
        }

        try {
          // Create quote for this jar transfer
          const quoteResponse = await fastify.axios.post(
            `${fastify.config.WISE_API_URL}/v2/quotes`,
            {
              sourceCurrency: jar.currency,
              targetCurrency: jar.currency,
              sourceAmount: transferAmount,
              profile: jar.profile,
              payOut: "BALANCE"
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          )

          const quote = quoteResponse.data

          // Create balance movement to transfer money to jar
          const transferResponse = await fastify.axios.post(
            `${fastify.config.WISE_API_URL}/v2/profiles/${jar.profile}/balance-movements`,
            {
              sourceBalanceId: null, // Will use main balance
              targetBalanceId: jar.wise_balance_id,
              sourceAmount: {
                value: transferAmount,
                currency: jar.currency,
              },
              customerTransactionId: uuidv4(),
              reference: reference || `Deal transfer to ${jar.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            }
          )

          const transfer = transferResponse.data

          // Create transaction record in wise_jar_transactions table
          const transactionData = {
            uuid: uuidv4(),
            deal_uuid: dealUuid,
            wise_jar_uuid: jar.uuid,
            wise_transfer_id: transfer.id,
            wise_quote_id: quote.id,
            amount: transferAmount,
            currency: jar.currency,
            reference: reference || `Deal transfer to ${jar.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
            status: transfer.status || 'PENDING',
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          }

          await fastify.prisma.wise_jar_transactions.create({
            data: transactionData
          })

          transfers.push({
            jarId: jar.uuid,
            jarName: jar.name,
            percentage: jar.transfer_percent,
            amount: transferAmount,
            currency: jar.currency,
            transferId: transfer.id,
            quoteId: quote.id,
            status: transfer.status || 'PENDING',
            reference: transactionData.reference
          })

          totalTransferred += transferAmount

        } catch (jarError) {
          fastify.log.error(`Failed to transfer to jar ${jar.name}:`, jarError.response?.data || jarError.message)
          
          // Still record the failed transaction
          const failedTransactionData = {
            uuid: uuidv4(),
            deal_uuid: dealUuid,
            wise_jar_uuid: jar.uuid,
            wise_transfer_id: null,
            wise_quote_id: null,
            amount: transferAmount,
            currency: jar.currency,
            reference: `FAILED: ${reference || `Deal transfer to ${jar.name} - ${moment().format('YYYY-MM-DD HH:mm:ss')}`}`,
            status: 'FAILED',
            created_at: moment().toISOString(),
            modified_at: moment().toISOString(),
          }

          await fastify.prisma.wise_jar_transactions.create({
            data: failedTransactionData
          })

          transfers.push({
            jarId: jar.uuid,
            jarName: jar.name,
            percentage: jar.transfer_percent,
            amount: transferAmount,
            currency: jar.currency,
            transferId: null,
            quoteId: null,
            status: 'FAILED',
            error: jarError.response?.data?.errors?.[0]?.message || jarError.message,
            reference: failedTransactionData.reference
          })
        }
      }

      // Step 6: Create summary
      const summary = {
        dealAmount: dealAmount,
        totalTransferred: totalTransferred,
        remainingAmount: dealAmount - totalTransferred,
        totalPercentageUsed: totalPercentage,
        successfulTransfers: transfers.filter(t => t.status !== 'FAILED').length,
        failedTransfers: transfers.filter(t => t.status === 'FAILED').length,
        totalJars: jars.length
      }

      return {
        success: true,
        message: `Transferred ${totalTransferred} from deal amount ${dealAmount} to ${transfers.length} jars`,
        transfers: transfers,
        totalTransferred: totalTransferred,
        summary: summary
      }

    } catch (error) {
      fastify.log.error('Transfer deal to jars error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.errors?.[0]?.message || error.message || 'Failed to transfer deal to jars')
    }
  })

  // NEW: Check if deal has already been transferred to jars
  fastify.decorate('checkDealTransferStatus', async function (dealUuid) {
    try {
      const existingTransfers = await fastify.prisma.wise_jar_transactions.findMany({
        where: {
          deal_uuid: dealUuid,
          deleted_at: null
        },
        include: {
          wise_jars: {
            select: {
              uuid: true,
              name: true,
              currency: true,
              transfer_percent: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      const successfulTransfers = existingTransfers.filter(t => 
        t.status === 'COMPLETED' || t.status === 'PENDING' || t.status === 'PROCESSING'
      )
      
      const failedTransfers = existingTransfers.filter(t => t.status === 'FAILED')

      const totalTransferred = existingTransfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      const successfulAmount = successfulTransfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

      return {
        hasTransfers: existingTransfers.length > 0,
        hasSuccessfulTransfers: successfulTransfers.length > 0,
        totalTransfers: existingTransfers.length,
        successfulTransfers: successfulTransfers.length,
        failedTransfers: failedTransfers.length,
        totalAmount: totalTransferred,
        successfulAmount: successfulAmount,
        transfers: existingTransfers.map(t => ({
          id: t.uuid,
          jarId: t.wise_jar_uuid,
          jarName: t.wise_jars?.name,
          amount: t.amount,
          currency: t.currency,
          percentage: t.wise_jars?.transfer_percent,
          status: t.status,
          transferId: t.wise_transfer_id,
          quoteId: t.wise_quote_id,
          reference: t.reference,
          createdAt: t.created_at,
          modifiedAt: t.modified_at
        })),
        lastTransferDate: existingTransfers.length > 0 ? existingTransfers[0].created_at : null
      }

    } catch (error) {
      fastify.log.error('Check deal transfer status error:', error)
      throw new Error('Failed to check deal transfer status')
    }
  })

  // NEW: Get jar transfer summary for a deal
  fastify.decorate('getDealJarTransfers', async function (dealUuid) {
    try {
      const transfers = await fastify.prisma.wise_jar_transactions.findMany({
        where: {
          deal_uuid: dealUuid,
          deleted_at: null
        },
        include: {
          wise_jars: {
            select: {
              uuid: true,
              name: true,
              currency: true,
              transfer_percent: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      const summary = {
        totalTransfers: transfers.length,
        totalAmount: transfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        successfulTransfers: transfers.filter(t => t.status === 'COMPLETED' || t.status === 'PENDING').length,
        failedTransfers: transfers.filter(t => t.status === 'FAILED').length,
        currencies: [...new Set(transfers.map(t => t.currency))]
      }

      return {
        transfers: transfers,
        summary: summary
      }

    } catch (error) {
      fastify.log.error('Get deal jar transfers error:', error)
      throw new Error('Failed to get deal jar transfers')
    }
  })
})

