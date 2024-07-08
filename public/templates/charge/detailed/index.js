/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let clearingInstruction,
  draweeInstruction,
  detailedFinancialUrl

  if (options?.associatedTemplates?.length > 0) {
    const financialTemplateId = options.associatedTemplates.find(item => item.key === 'detailedFinancialReport')?.template?.value?.toString()
    detailedFinancialUrl = options?.reportPermissions?.includes(financialTemplateId) ? `https://sandbox.worksmarter.com.br/report/${financialTemplateId}?query={{query}}` : ''
  }

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const getBankAccount = async (id) => {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
        {
          showBankAccount(where: {
          id: {
            eq: ${id}
          }
        }){
            enums
            payload {
              name
              agencyNumber
              agencyDigit
              accountNumber
              accountDigit
              accountType
              bank {
                name
                bacenCode
              }
            }
          }
        }
      ` })
    })
    const { data: { showBankAccount: { payload, enums } } } = await response.json()
    if (payload.length > 0) {
      const account = payload[0]

      const accountType = account.accountType ? enums.filter(
        obj => obj.enum === 'account_type',
      ).map(obj => obj?.values?.find(
        value => value[account?.accountType] || false,
      )).map(value => value[account?.accountType]?.translate) : false

      return {
        ...payload[0],
        accountType: accountType[0],
      }
    }

    return {}
  }

  const getFinancialLaunchIndex = async (id) => {
    const query = {"must":[{"match":{"id": id}}]}

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetFinancialLaunch($query: JSON!){
            financialLaunchIndex(
              query: $query,
              source: [
                "user_description",
                "entity.social_reason",
                "launch_amount",
                "down_date",
                "down_net_amount",
                "id",
                "status",
              ]
            ) {
              payload
              errors {
                messages
              }
            }
          }
        `,
        variables: {
          query: JSON.stringify(query)
        },
      })
    })
    const { data: { financialLaunchIndex: { payload } } } = await response.json()
    if (payload[0]) {
      return {
        ...payload[0]._source,
        url: detailedFinancialUrl.replace('{{query}}', btoa(JSON.stringify({
          query: JSON.stringify({ must: [{ match: {id: payload[0]._source.id } }] }),
        }))),
      }
    }
    return null
  }

  const getOpenStatus = (dueDateItem) => {
    const dueDate = new Date(`${dueDateItem} GMT-0300`)
    const today = new Date().setHours(0,0,0,0)

    return dueDate < today ? 'overdue' : 'open'
  }

  const {
    chargeAccountIndex: {
      payload,
    },
  } = data

  if (payload?.length > 0) {
    const {
      _source: {
        bank_account,
        ...chargeItem
      },
    } = payload[0]

    const bankAccount = await getBankAccount(bank_account.id)

    clearingInstruction = Object.entries(chargeItem)
      .filter(item => item[0].includes('clearing_instruction_line')
        && item[1]).length > 0 ? true : undefined
    draweeInstruction = Object.entries(chargeItem)
      .filter(item => item[0].includes('drawee_instruction_line')
        && item[1]).length > 0 ? true : undefined

    const newData = {
      chargeAccountIndex: {
        payload: {
          _source: {
            ...chargeItem,
            bankAccount,
            clearingInstruction,
            draweeInstruction,
            inRemittance: chargeItem.status === 'in_remittance' || undefined,
            remittance: chargeItem.remittance[0],
            entityType: chargeItem.entity_drawee.type === 'individual'
              ? 'CPF' : chargeItem.entity_drawee.type === 'legal_entity' ? 'CNPJ' : 'Documento legal',
            legalEntity: chargeItem.entity_drawee.type !== 'individual' || undefined,
            acceptance: chargeItem.acceptance === 'A' ? 'Aceito' : 'Não aceito',
            write_off_type: chargeItem.write_off_type === 'no'
              ? 'Não'
              : `Sim (${chargeItem.write_off_days} ${chargeItem.write_off_days > 1 ? 'dias' : 'dia'})`,
            financialLaunchs: await Promise.all(chargeItem.financial_launch_ids.map(async(item) => {
              const data = await getFinancialLaunchIndex(item)
              return {
                ...data,
                status: data.status === 'open' ? getOpenStatus(data.due_date) : data.status,
              }
            })),
            receivedStatus: chargeItem.status === "received" || undefined,
            receivement_date: chargeItem.receivement_date?.split('T')[0],
            canceledStatus: chargeItem.status === "canceled" || undefined,
          },
        }
      }
    }

    return newData
  }

  return {
    chargeAccountIndex: null
  }
}
