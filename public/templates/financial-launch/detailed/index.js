/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let parceled,
    recurrent,
    apportionment,
    retention,
    receivable_account,
    charges,
    customs_clearance_id,
    financial_downs,
    related,
    relateds,
    detailedMovementUrl,
    detailedFinancialUrl,
    detailedChargeUrl

	if (options?.associatedTemplates?.length > 0) {
    const movementTemplateId = options.associatedTemplates.find(item => item.key === 'detailedBankMovement')?.template?.value?.toString()
    const financialTemplateId = options.associatedTemplates.find(item => item.key === 'detailedFinancialReport')?.template?.value?.toString()
    const chargeTemplateId = options.associatedTemplates.find(item => item.key === 'detailedChargeReport')?.template?.value?.toString()

    detailedMovementUrl = options?.reportPermissions?.includes(movementTemplateId) ? `/report/${movementTemplateId}?query={{query}}` : ''
    detailedFinancialUrl = options?.reportPermissions?.includes(financialTemplateId) ? `/report/${financialTemplateId}?query={{query}}` : ''
    detailedChargeUrl = options?.reportPermissions?.includes(financialTemplateId) ? `/report/${chargeTemplateId}?query={{query}}` : ''
  }

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const getFinancialLaunchIndex = async (id, source) => {
    const query = { must:[ { match: { id } } ]}
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetFinancialLaunch(
            $query: JSON!
            $source: [String!]
          ){
            financialLaunchIndex(
              query: $query
              source: $source
            ) {
              payload
              errors {
                messages
              }
            }
          }
        `,
        variables: {
          query: JSON.stringify(query),
          source,
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

  const getChargeAccountIndex = async (id, source) => {
    const query = { must:[ { match: { id } } ]}
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetChargeAccount(
            $query: JSON!
            $source: [String!]
          ) {
            chargeAccountIndex(
              query: $query
              source: $source
            ) {
              payload
              errors {
                messages
              }
            }
          }
        `,
        variables: {
          query: JSON.stringify(query),
          source,
        },
      })
    })
    const { data: { chargeAccountIndex: { payload } } } = await response.json()
    if (payload[0]) {
      return {
        ...payload[0]._source,
        url: detailedChargeUrl.replace('{{query}}', btoa(JSON.stringify({
          query: JSON.stringify({ must: [{ match: {id: payload[0]._source.id } }] }),
        }))),
      }
    }
    return null
  }

  const getBankAccountMovementIndex = async (id, source) => {
    const query = {
      must:[
        { match:{ movement_type: "unique" } },
        {
          nested:{
            path: "installments",
            query: { match:{ "installments.id": id } }
          }
        }
      ]
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetBankAccount(
            $query: JSON!
            $source: [String!]
          ) {
            bankAccountMovementIndex(
              query: $query
              source: $source
            ) {
              payload
              errors {
                messages
              }
            }
          }
        `,
        variables: {
          query: JSON.stringify(query),
          source,
        }
      })
    })
    const { data: { bankAccountMovementIndex: { payload } } } = await response.json()

    if (payload[0]) {
      return {
        ...payload[0]._source,
        url: detailedMovementUrl.replace('{{query}}', btoa(JSON.stringify({
          query: JSON.stringify({ must: [{ match: {id: payload[0]._source.id } }] }),
        }))),
      }
    }
    return null
  }

  const {
    financialLaunchIndex: {
      payload,
    },
  } = data;
  if (payload[0]) {
    const { _source } = payload[0];
    const {
      id,
      periodicity_id,
      customs_clearance,
      apportionment_type,
      launch_operation,
      due_date,
      launch_amount,
      user_description,
      status,
      apportionments,
      retentions,
      charge_accounts,
      downs,
      launch_type,
      installment_number,
      installment_number_detail,
      company,
      descendents,
      down_net_amount,
      ...source
    } = _source;

    const periodicity = {
      1: 'Semanal',
      2: 'Quinzenal',
      3: 'Mensal',
      4: 'Trimestral',
      5: 'Semestral',
      6: 'Anual',
    }

    if (launch_type === 'parceled') {
      parceled = {
        installment_number,
        periodicity_id: periodicity[periodicity_id],
        installment_number_detail,
        list: await Promise.all(descendents.filter(item => item !== id).map(async (item) => {
          const getData = await getFinancialLaunchIndex(
            item,
            [
              'installment_number',
              'due_date',
              'user_description',
              'status',
              'id'
            ]
          )
          return ({
            installment_number: getData.installment_number,
            due_date: getData.due_date,
            user_description: getData.user_description,
            status: getData.status,
            launch_amount: getData.launch_amount,
            url: getData.url,
          })
        }))
      }

    }

    if (launch_type === 'recurrent') {
      recurrent = {
        list: await Promise.all(descendents.filter(item => item !== id).map(async (item) => {
          const getData = await getFinancialLaunchIndex(
            item,
            [
              'installment_number',
              'due_date',
              'user_description',
              'status',
              'launch_amount',
              'id',
            ]
          )

          return ({
            installment_number: getData.installment_number,
            due_date: getData.due_date,
            user_description: getData.user_description,
            status: getData.status,
            launch_amount: getData.launch_amount,
            url: getData.url,
          })
        }))
      }
    }

    if (apportionment_type !== 'none') {
      apportionment = {}
      if (apportionment_type === 'by_cost_center') {
        Object.assign(apportionment, {
          by_cost_center: true,
          list: await Promise.all(apportionments.map(async (item) => {
            const getData = await getFinancialLaunchIndex(
              item,
              [
                'cost_center',
                'due_date',
                'user_description',
                'launch_amount',
                'id',
              ]
            )

            return ({
              cost_center_name: getData.cost_center ? getData.cost_center.name : null,
              aliquot: (getData.launch_amount / launch_amount) * 100,
              due_date: getData.due_date,
              user_description: getData.user_description,
              launch_amount: getData.launch_amount,
              url: detailedFinancialUrl.replace('{{query}}', btoa(JSON.stringify({
                query: JSON.stringify({ must: [{ match: {id: getData.id } }] }),
              })))
            })
          }))
        })
      } else {
        Object.assign(apportionment, {
          list: await Promise.all(apportionments.map(async (item) => {
            const getData = await getFinancialLaunchIndex(
              item,
              [
                'customs_clearance',
                'cash_launch_setting_id',
                'due_date',
                'user_description',
                'launch_amount',
                'id',
              ]
            )
            return ({
              customs_clearance_reference: getData.customs_clearance ? getData.customs_clearance.reference : null,
              cash_launch_setting_id: getData.cash_launch_setting_id,
              due_date: getData.due_date,
              user_description: getData.user_description,
              launch_amount: getData.launch_amount,
            })
          }))
        })
      }
    }

    if (retentions.length > 0) {
      retention = {
        retentions,
      }
    }

    if (launch_operation === 'receivable_account') {
      receivable_account = true
      if (charge_accounts.length > 0) {
        charges = {
          list: await Promise.all(charge_accounts.map(async (item) => {
            const getData = await getChargeAccountIndex(
              item,
              [
                'entity_drawee',
                'bank_account',
                'portfolio_code',
                'kind',
                'sequence',
                'our_number',
                'amount',
                'due_date',
                'status',
                'id',
              ]
            )

            return ({
              entity_name: getData.entity_drawee.social_reason,
              bank_account_name: getData.bank_account.name,
              portfolio_code: getData.portfolio_code,
              kind: getData.kind,
              sequence: getData.sequence,
              our_number: getData.our_number,
              amount: getData.amount,
              due_date: getData.due_date,
              status: getData.status,
              url: getData.url,
            })
          }))
        }
      }
    }

    if (customs_clearance) customs_clearance_id = customs_clearance.id

    if (downs.length > 0) {
      financial_downs = await Promise.all(downs.map(async (item) => {
        return ({
          bank_account: item.bank_account,
          cost_center: item.cost_center,
          payment_mean: item.payment_mean,
          down_date: item.down_date,
          document_type: item.document_type,
          document_number: item.document_number,
          document_date: item.document_date,
          amount: item.amount,
          fine: item.fine,
          interest: item.interest,
          discount: item.discount,
          launched_in_customs_clearance: item.launched_in_customs_clearance,
          paid: item.paid,
          grouped: item.down_type === 'multiple' ? 'Sim' : 'Não',
          bank_account_movement_installment_id: item.bank_account_movement_installment_id,
          bank_account_movement_installment: item.bank_account_movement_installment_id ? await getBankAccountMovementIndex(
            item.bank_account_movement_installment_id,
            [
              'movement_date',
              'description',
              'movement_amount',
              'id'
            ]
          ) : null,
        })
      }))

      if (downs.filter(item => item.down_type === 'multiple').length > 0) {
        let financial_launch_ids = []
        relateds = []
        related = true

        downs.filter(item => item.down_type === 'multiple')
          .forEach(item => {
            item.financial_launch_ids.filter(flId => flId !== id).forEach(flId => financial_launch_ids.push(flId))
          })

        await Promise.all(financial_launch_ids.map(async (item) => {
          const request = await getFinancialLaunchIndex(
            item,
            [
              'id',
              'user_description',
              'due_date',
              'launch_amount',
              'down_net_amount',
            ]
          )

          relateds.push({
            url: request.url,
            user_description: request.user_description,
            due_date: request.due_date,
            launch_amount: request.launch_amount,
            down_net_amount: request.down_net_amount,
          })

          return null
        }))
      }
    }

    const getStatus = () => {
      if (status === 'open') {
        const dueDate = new Date(`${due_date} GMT-0300`)
        const today = new Date().setHours(0,0,0,0)

        return dueDate < today ? 'overdue' : 'open'
      }

      if (receivable_account && status === 'paid') return 'received'

      if (receivable_account && status === 'partially_paid') return 'partially_received'

      return status
    }

    const newData = {
      financialLaunchIndex: {
        payload: [
          {
            _source: {
              parceled,
              recurrent,
              apportionment,
              retention,
              receivable_account,
              charges,
              customs_clearance_id,
              customs_clearance,
              financial_downs,
              related,
              relateds,
              status: getStatus(),
              user_description,
              due_date,
              launch_amount,
              down_net_amount,
              launch_type,
              ...source
            }
          }
        ]
      }
    }

    return newData
  }
  return {
    financialLaunchIndex: {
      payload: [
        {
          _source: {},
        },
      ],
    },
  }
}
