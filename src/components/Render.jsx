import { useState, useEffect } from 'react'
import ReactMustache from 'react-mustache'
import Frame from 'react-frame-component/'
import { tokenData } from './data'
import { mustacheMethods } from './mustacheMethods'

// SETAR VALORES

const authorization = '' // jwt token

const endpoint = '' // adicionar endpoint
const templateId = 185 // resumido(synthetic): 185, detalhado(analytics): 98

// ATUALIZAR OS ARQUIVOS COM BASE NA VERSÃO ATUAL DO SISTEMA. CUIDADO PARA NÃO SOBRESCREVER!
const htmlEndpoint = 'cash-flow/synthetic.html'
const helperEndpoint = 'cash-flow/synthetic.js'
const optionsEndpoint = 'cash-flow/synthetic.json'

// variavéis do elasticsearch

const variables = {
  query: JSON.stringify({
    must: [{
        bool: {
          should: [
            // REALIZADO
            { match: { status: 'partially_paid' } },
            { match: { status: 'paid' } },
            { match: { status: 'conciliated' } },
            // EM ABERTO
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
            gte: "2023-04-01",
            lte: "2023-04-30",
          }
        }
      },
      // CASO FOR REALIZADO
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
      //     },
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

// permissões de relatórios

const reportPermissions = [
  'report_53_dynamic_report',
  'report_54_dynamic_report',
  'report_64_dynamic_report',
  'report_65_dynamic_report',
  'report_95_dynamic_report',
  'report_98_dynamic_report',
  'report_185_dynamic_report',
] // inserir permissões em array ex: ['report_65_dynamic_report']

export const Render = () => {
  const [templateData, setData] = useState(null)
  const [htmlCodeInput, setHtmlCodeInput] = useState('')

  // busca os dados do template
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

  // executa a query do template
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

    const getHelperData = await executeHelper({
      data,
      authorization,
      endpoint: endpoint,
      options: {
        ...options,
        reportPermissions: reportPermissions
          .map(item => item.replace('_dynamic_report', '')
            .split('_')[1]).sort(),
        filterFields: { ...JSON.parse(variables.query) },
      },
    })

    setData(getHelperData)
  }

  // fetch do html na pasta public/template
  const htmlCode = async () => {
    const response = await fetch(`http://localhost:3000/templates/${htmlEndpoint}`)

    const data = await response.text()

    setHtmlCodeInput(data)
  }

  // fetch do helper na pasta public/template
  const helperCode = async () => {
    const response = await fetch(`http://localhost:3000/templates/${helperEndpoint}`)

    const data = await response.text()

    return data
  }

  // fetch do options na pasta public/template
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