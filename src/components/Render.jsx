import { useState, useEffect } from 'react'
import ReactMustache from 'react-mustache'
import Frame from 'react-frame-component/'
import { tokenData } from './data'
import { mustacheMethods } from './mustacheMethods'

// SETAR VALORES

const authorization = '' // jwt token

const endpoint = 'https://gateway-sandbox.worksmarter.com.br/graphql'
const templateId = 185 // resumido(synthetic): 185, detalhado(analytics): 98
const htmlEndpoint = 'cash-flow/synthetic.html'
const helperEndpoint = 'cash-flow/synthetic.js'
const optionsEndpoint = 'cash-flow/synthetic.json'

const variables = {
  query: JSON.stringify({
    must: [{
        bool: {
          should: [
            { match: { status: 'partially_paid' } },
            { match: { status: 'paid' } },
            { match: { status: 'conciliated' } },
            { match: { status: 'open' } },
          ],
        },
      },
      {
        bool: {
          should: [
            { match: { launch_operation: 'payable_account' } },
            { match: { launch_operation: 'receivable_account' } },
          ],
        },
      },
      {
        range: {
          due_date: {
            gte: "2023-01-01",
            lte: "2023-04-30",
          }
        }
      },
      // {
      //   nested: {
      //     path: "downs",
      //     query: {
      //       bool: {
      //         must: [
      //           {
      //             exists: {
      //               field: "downs.id"
      //             }
      //           },
      //           {
      //             range: {
      //               'downs.down_date': {
      //                 gte: "2023-03-01",
      //                 lte: "2023-04-01",
      //               }
      //             }
      //           }
      //         ]
      //       }
      //     }
      //   }
      // }
    ],
    must_not: [{
      exists: {
        field: 'deleted_at',
      },
    }],
  }),
}

export const Render = () => {
  const [templateData, setData] = useState(null)
  const [htmlCodeInput, setHtmlCodeInput] = useState('')

  const getTemplate = async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          {
            showTemplate(where: {
              id: {
                eq: ${templateId}
              }
            }) {
              payload {
                id
                code
                query
                settings
              }
            }
          }
        `,
      })
    })

    const { data: { showTemplate: { payload } } } = await response.json()

    return payload[0]
  }

  const getQuery = async (query) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      })
    })

    const { data } = await response.json()

    // eslint-disable-next-line no-eval
    const executeHelper = eval(await helperCode())
    const options = JSON.parse(await optionsCode())

    const getHelperData = await executeHelper({ data, authorization, endpoint: endpoint, options })

    setData(getHelperData)
  }

  const htmlCode = async () => {
    const response = await fetch(`http://localhost:3000/templates/${htmlEndpoint}`)

    const data = await response.text()

    setHtmlCodeInput(data)
  }

  const helperCode = async () => {
    const response = await fetch(`http://localhost:3000/templates/${helperEndpoint}`)

    const data = await response.text()

    return data
  }

  const optionsCode = async () => {
    const response = await fetch(`http://localhost:3000/templates/${optionsEndpoint}`)

    const data = await response.text()

    return data
  }

  useEffect(() => {
    const execute = async () => {
      const template = await getTemplate()
      await getQuery(template.query)
      await htmlCode()
    }
    execute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!templateData) return null

  return (
    <div className="row">
      <div className="col-12">
        <Frame
          id="template"
          width="100%"
          height="900px"
          style={{
            border: 'none',
            borderRadius: '5px',
            overflow: 'auto',
            backgroundColor: '#fff',
          }}
        >
          <ReactMustache template={htmlCodeInput} data={{ ...templateData, ...mustacheMethods, ...tokenData }} />
        </Frame>
      </div>
    </div>
  )
}