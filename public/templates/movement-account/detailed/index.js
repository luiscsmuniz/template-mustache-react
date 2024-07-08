/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let movementOperationPayable,
    bankAccount,
    installmentsArray,
    detailedUrl

	if (options?.associatedTemplates?.length > 0) {
    const templateId = options.associatedTemplates.find(item => item.key === 'detailedReport')?.template?.value?.toString()

    detailedUrl = options?.reportPermissions?.includes(templateId) ? `/report/${templateId}?query={{query}}` : ''
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
            payload {
              name
              agencyNumber
              agencyDigit
              accountNumber
              accountDigit
              bank {
                name
              }
            }
          }
        }
      ` })
    })
    const { data: { showBankAccount: { payload } } } = await response.json()
    if (payload.length > 0) {
      return payload[0]
    }

    return {}
  }

  const getFinancialLaunch = async (id, source) => {
    const variables = {
      query: JSON.stringify({
        must: [{
          nested: {
            path: 'downs',
            query: {
              match: {
                "downs.id": id
              }
            }
          }
        }],
      }),
      source,
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query getFinancialLaunch(
            $query: JSON!
            $source: [String!]
          ) {
            financialLaunchIndex(
              query: $query
              source: $source
            ) {
              payload
              errors {
                meta {
                  path
                }
                messages
              }
            }
          }
        `,
        variables,
      })
    })
    const { data: { financialLaunchIndex: { payload } } } = await response.json()
    if (payload.length > 0) {
      return payload
    }

    return {}
  }

  const onlyUnique = (value, index, array)=> {
    return array.indexOf(value) === index;
  }

  const {
    bankAccountMovementIndex: {
      payload,
    },
  } = data;

  const movementTypeTranslate = {
    unique: 'Único',
    division: 'Divisão',
    transfer: 'Transfêrencia',
    initial_launch: 'Saldo inicial',
    adjust_balance: 'Saldo ajustado',
  }

  if (payload[0]) {
    const { _source: {
      id,
      movement_operation,
      bank_account,
      installments,
      movement_type,
      ...source
    } } = payload[0];

    if (movement_operation === 'debit') movementOperationPayable = true

    bankAccount = await getBankAccount(bank_account.id)

    installmentsArray = await Promise.all(installments.map(async(item) => {
      const { financial_launch_down_id } = item
      const downTypeTranslate = {
        unique: 'Único',
        multiple: 'Múltiplo',
      }

      let financialLaunchDown

      const financialLaunch = financial_launch_down_id ? await getFinancialLaunch(
        financial_launch_down_id,
        [
          "downs",
          "user_description",
          "id",
          "launch_amount",
          "down_net_amount",
          "cost_center",
          "customs_clearance",
          "entity",
          "plan_account"
        ]
      ) : []
      const financialLaunchDownItems = []

      financialLaunch.forEach(finItem => {
        finItem._source.downs.filter(down => item.id === down.bank_account_movement_installment_id).forEach(down => {
          financialLaunchDownItems.push({
            ...finItem._source,
            ...down,
          })
        })
      })

      if (financialLaunch.length > 0) {
        financialLaunchDown = {
          financialLaunch: financialLaunch.map(finItem => {
            const cost_center_financial_launch = finItem._source.cost_center
            const customs_clearance_financial_launch = finItem._source.customs_clearance
            const down_net_amount_financial_launch = finItem._source.down_net_amount

            return ({
              ...finItem._source,
              cost_center_financial_launch,
              down_net_amount_financial_launch,
              customs_clearance_financial_launch,
              url: detailedUrl.replace('{{query}}', btoa(JSON.stringify({
                query: JSON.stringify({ must: [{ match: {id: finItem._source.id } }] }),
              }))),
            })
          }).sort((a, b) => {
            if (a.user_description === b.user_description) {
              return 0;
            }
            else {
              return (a.user_description < b.user_description) ? -1 : 1;
            }
          }),
          down_type: downTypeTranslate[financialLaunchDownItems.map(finItem => finItem.down_type).filter(onlyUnique)[0]],
          payment_mean: {
            name: financialLaunchDownItems.map(finItem => finItem.payment_mean.name).filter(onlyUnique)[0]
          },
          down_date: item.movement_date,
          amount: Number(financialLaunchDownItems.map(finItem => finItem.amount).filter(onlyUnique)[0]),
          fine: Number(financialLaunchDownItems.map(finItem => finItem.fine).filter(onlyUnique)[0]),
          discount: Number(financialLaunchDownItems.map(finItem => finItem.discount).filter(onlyUnique)[0]),
          interest: Number(financialLaunchDownItems.map(finItem => finItem.interest).filter(onlyUnique)[0]),
          paid: Number(financialLaunchDownItems.map(finItem => finItem.paid).filter(onlyUnique)[0]),
        }
      }

      return {
        ...item,
        financialLaunchDown,
      }
    }))

    const newData = {
      bankAccountMovementIndex: {
        payload: [
          {
            _source: {
              movement_operation: movement_operation === 'debit' ? 'Débito' : 'Crédito',
              movement_type: movementTypeTranslate[movement_type],
              movementOperationPayable,
              bankAccount,
              installmentsArray,
              ...source
            },
          }
        ]
      }
    }

    return newData
  }
  return {
    bankAccountMovementIndex: {
      payload: [
        {
          _source: {},
        },
      ],
    },
  }
}
