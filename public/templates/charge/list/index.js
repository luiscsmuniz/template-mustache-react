/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  let detailedChargeReport

  if (options?.associatedTemplates?.length > 0) {
    const chargeTemplateId = options.associatedTemplates.find(item => item.key === 'detailedChargeReport')?.template?.value?.toString()
    detailedChargeReport = options?.reportPermissions?.includes(chargeTemplateId) ? `/report/${chargeTemplateId}?query={{query}}` : ''
  }

  const {
    chargeAccountIndex: {
      payload,
    },
  } = data

  if (payload) {
    const newData = {
      chargeAccountIndex: {
        payload: payload.map(item => ({
          ...item._source,
          company_name: `${item._source.company?.fancy_name || item._source.company?.social_reason} (${item._source.company?.national_identifier.substr(8, 4)})`,
          url: detailedChargeReport.replace('{{query}}', btoa(JSON.stringify({
            query: JSON.stringify({ must: [{ match: {id: item._source.id } }] }),
          }))),
        })),
      }
    }

    return newData
  }

  return {
    chargeAccountIndex: null
  }
}
