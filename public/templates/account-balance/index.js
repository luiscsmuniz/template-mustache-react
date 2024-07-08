/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  const {
    bankAccountMovementIndex: {
      aggregations,
      errors,
    },
  } = data

  const grouped = []

  aggregations.by_bank.bank_account_id.buckets.forEach(item => grouped.push({ name: item.bank_account_name.buckets[0].key, value: item.bank_account_name.buckets[0].movement_amount_sum.sum.value}))

  if (!errors) {
    const items = grouped.map(item => ({
      bank_account_name: item.name,
      sum: item.value,
    })).sort((a, b) => {
      if (a.bank_account_name === b.bank_account_name) {
        return 0;
      }
      else {
        return (a.bank_account_name < b.bank_account_name) ? -1 : 1;
      }
    })

    return {
      bankAccountMovementIndex: {
        items,
        total: options.sum(items, 'sum')
      },
    }
  }

  return {
    bankAccountMovementIndex: null
  }
}
