/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let total = 0

  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

  const getFinancialLaunchByDueDate = async (ids) => {
    const withoutDownDateMust = options.filterFields.must.filter(item => item?.nested?.path !== 'downs')
    const withoutDownDateMustNot = options.filterFields.must_not.filter(item => item?.nested?.path !== 'downs')

    const rangeDownDateMust = options.filterFields.must
      ?.find(item => item.nested?.path === 'downs')?.nested?.query?.bool?.must
      ?.find(item => item?.range)?.range

    const rangeDownDateMustNot = options.filterFields.must_not
      ?.find(item => item.nested?.path === 'downs')?.nested?.query?.bool?.must
      ?.find(item => item?.range)?.range

    const query = {
      must: [
        ...(rangeDownDateMust ? [{
          range: {
            due_date: rangeDownDateMust['downs.down_date'],
          }
        }] : []),
        ...withoutDownDateMust,
      ],
      must_not: [
        ...withoutDownDateMustNot,
        ...(rangeDownDateMustNot ? [{
          range: {
            due_date: rangeDownDateMustNot['downs.down_date'],
          }
        }] : []),
        ...(ids?.length > 0 ? [{
          terms: {
            id: ids,
          }
        }] : [])
      ]
    }

    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
          query GetFinancialLaunchByDueDate ($query: JSON!) {
            financialLaunchIndex(
              query: $query
              source: [
                "id",
                "due_date",
                "shipment",
                "launch_amount",
                "down_net_amount",
                "downs",
                "project",
                "user_description",
                "status",
                "shipment_launch_operation",
                "customs_clearance_launch_operation",
                "down_date",
                "entity",
                "plan_account",
                "company",
                "bank_Account",
              ]
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
        variables: {
          query: JSON.stringify(query),
        }
      })
    })
    const { data: { financialLaunchIndex: { payload } } } = await response.json()

    return payload
  }

  const filterDate = item => {
    const filterDate = options.filterFields.must
    ?.find(item => item.nested?.path === 'downs')?.nested?.query?.bool?.must
    ?.find(item => item?.range)?.range['downs.down_date']

    if (filterDate) {
      const date = new Date(item.date)
      const gte = new Date(filterDate.gte)
      const lte = new Date(filterDate.lte)

      return date >= gte && date <= lte
    }

    return item
  }

  const {
    financialLaunchIndex: {
      payload,
    },
  } = data
  if (payload) {
    payload.push(...await getFinancialLaunchByDueDate(payload.map(item => item._source.id)))

    const newPayload = []

    payload.map(item => ({
      date: ['partially_paid', 'paid', 'conciliated'].includes(item._source.status)
        ? item._source.down_date
        : item._source.due_date,
      ...item._source,
    })).filter(filterDate).sort((a, b) => {
      if (a.date === b.date) {
        return 0;
      }
      else {
        return (a.date < b.date) ? -1 : 1;
      }
    }).forEach(item => {
      const date = new Date(`${item.date} GMT-0300`)

      const lastYear = new Date(date.getFullYear(), date.getMonth()+1, 0).toLocaleDateString()

      const downsArray =  item?.inner_hits?.downs?.hits?.hits?.map(downs => downs._source) || item.downs

      if (downsArray?.length > 0) {
        downsArray.forEach(down => {
          let incoming_amount = 0,
            outgoing_amount = 0

          const launchAmount = down.down_type === 'multiple' ? Number(item.down_net_amount) : Number(down.paid)

          if (item.shipment_launch_operation === 'expense' || item.customs_clearance_launch_operation === 'expense') {
            outgoing_amount = launchAmount * -1
            total += outgoing_amount
          } else {
            incoming_amount = launchAmount
            total += incoming_amount
          }

          newPayload.push({
            date: item.date,
            incoming_amount,
            outgoing_amount,
            total,
            status: item.status,
            shipment_name: item?.shipment?.name,
            project_name: item.project?.name,
            user_description: item.user_description,
            lastYear,
            bank_account: down.bank_account,
            entity: item.entity,
            plan_account_name: item?.plan_account ? `${item?.plan_account?.reference} - ${item?.plan_account?.name}` : null,
            company_name: `${item.company?.fancy_name || item.company?.social_reason} (${item.company?.national_identifier.substr(8, 4)})`,
            shipment: item.shipment,
          })
        })
      } else {
        let incoming_amount = 0,
          outgoing_amount = 0

        if (item.shipment_launch_operation === 'expense' || item.customs_clearance_launch_operation === 'expense') {
          outgoing_amount = Number(item.launch_amount) * -1
          total += outgoing_amount
        } else {
          incoming_amount = Number(item.launch_amount)
          total += incoming_amount
        }

        newPayload.push({
          date: item.date,
          incoming_amount,
          outgoing_amount,
          total,
          status: item.status,
          shipment_name: item?.shipment?.name,
          project_name: item.project?.name,
          user_description: item.user_description,
          lastYear,
          entity: item.entity,
          bank_account: item.bank_account,
          plan_account_name: item?.plan_account ? `${item?.plan_account?.reference} - ${item?.plan_account?.name}` : null,
          company_name: `${item.company?.fancy_name || item.company?.social_reason} (${item.company?.national_identifier.substr(8, 4)})`,
          shipment: item.shipment,
        })
      }
    })

    const newItems = Object.entries(options.groupBy(newPayload, 'lastYear')).map(item => ({
      groupedDate: item[0],
      subTotal: item[1][item[1].length - 1].total,
      list: item[1],
      subTotalIncomingAmount: options.sum(item[1], 'incoming_amount'),
      subTotalOutgoingAmount: options.sum(item[1], 'outgoing_amount'),
    }))

    const newData = {
      financialLaunchIndex: {
        payload: newItems,
        total,
        totalIncomingAmount: options.sum(newItems, 'subTotalIncomingAmount'),
        totalOutgoingAmount: options.sum(newItems, 'subTotalOutgoingAmount'),
        hasPayload: payload.length > 0 || undefined,
      }
    }

    return newData
  }

  return {
    financialLaunchIndex: null
  }
}
