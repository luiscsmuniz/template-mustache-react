/* eslint-disable no-unused-expressions */
async ({ data, authorization, endpoint, options }) => {
  const method = 'POST'
  const headers = {
    authorization,
    'Content-Type': 'application/json',
  }

	const getFile = async (limit, start) => {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({
        query: `
        {
          showFile{
            payload(limit: ${limit}, offset: ${start}) {
              name
              id
            }
          }
        }
      ` })
    })
    const { data: { showFile: { payload } } } = await response.json()


    data.showFile.payload.push(...payload)
  }

  const limit = 100
  const items = data.showFile.count

  for (let start = 100; start < items; start += limit) await getFile(limit, start)

	return data
}
