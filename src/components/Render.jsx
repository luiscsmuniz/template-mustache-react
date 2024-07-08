import { useState, useEffect } from 'react'
import ReactMustache from 'react-mustache'
import Frame from 'react-frame-component/'
import * as ramda from 'ramda'
import Decimal from 'decimal.js'
import { tokenData } from './data'
import { mustacheMethods } from './mustacheMethods'
import { initialContent } from './initialContent'
import moment from 'moment'

// SETAR VALORES
const production = false
const productionToken = 'eyJraWQiOiJ5bFk2VTRGV1lzRUdjWWd3MmJXYnVJc1owdWdPTFp2VkRxaXFNWjcwQkwwIiwiYWxnIjoiSFM1MTIifQ.eyJpc3MiOiJDb21tb25Qcm92aWRlciIsImlhdCI6MTcyMDAzMTA0OSwiZXhwIjoxNzIwMDc0MjQ5LCJqdGkiOiJhNGQ0NWI1NS1jNGQ4LTQzNjUtOGZjZS05MjU5ZTY3OGUxNjgiLCJhcHBsaWNhdGlvbiI6eyJpbnRlcm5hbCI6dHJ1ZSwibmFtZSI6IlNNQVJURVIifSwiZGF0YSI6eyJ1aWQiOjEyNzcsIm5hbWUiOiJMdWlzIENhcmxvcyIsInN1cm5hbWUiOiJkZSBTb3V6YSBNdW5peiIsImVtYWlsIjoibHVpcy5tdW5pekBnZXR0LmNvbS5iciIsImFjY291bnQiOiJnZXR0cHJvIiwicHJpdmFjeV9wb2xpY3lfdmVyc2lvbiI6MSwicm9sZSI6eyJpZCI6NjQwLCJuYW1lIjoibHVpcy5tdW5pekBnZXR0LmNvbS5iciIsImFkbWluIjpmYWxzZX0sImludGVybmFsX3VzZXIiOnRydWUsIm9yZ2FuaXphdGlvbl9pZCI6NDUsIm9yZ2FuaXphdGlvbiI6IlBhdGFnw7RuaWEiLCJjb21wYW5pZXMiOls2NSw2Nl0sImxvZ2luX3R3b19mYWN0b3IiOnRydWV9fQ.x_hX4Vl2EbZnmm3cAmqzdu8CaRGeYjXNzRcQajPLMbS8gDwa18N_CuICu9Ay7NSYDVbiBdmYMX7jww8XIsQ-AQ'
const endpoint = production ? 'https://gateway.worksmarter.com.br/graphql' : 'https://gateway-sandbox.worksmarter.com.br/graphql' // adicionar endpoint
const templateId = 95 // resumido(synthetic): 185, detalhado(analytics): 98
// ATUALIZAR OS ARQUIVOS COM BASE NA VERSÃO ATUAL DO SISTEMA. CUIDADO PARA NÃO SOBRESCREVER!
const htmlEndpoint = 'movement-account/grouped/index.html'
const helperEndpoint = 'movement-account/grouped/index.js'
const optionsEndpoint = 'movement-account/grouped/index.json'
const variablesEndpoint = 'movement-account/grouped/variables.json'

// permissões de relatórios

const getCookie = (name) => {
  let cookies = document.cookie.split("; ");
  for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      let [cookieName, cookieValue] = cookie.split("=");
      if (cookieName === name) {
          return cookieValue;
      }
  }
  return null;
}

const reportPermissions = [
  'report_91_dynamic_report',
  'report_92_dynamic_report',
  'report_93_dynamic_report',
  'report_94_dynamic_report',
  'report_95_dynamic_report',
  'report_96_dynamic_report',
  'report_97_dynamic_report',
  'report_98_dynamic_report',
  'report_99_dynamic_report',
  'report_100_dynamic_report',
  'report_101_dynamic_report',
  'report_102_dynamic_report',
  'report_53_dynamic_report',
  'report_65_dynamic_report',

] // inserir permissões em array ex: ['report_65_dynamic_report']

const sum = (array, key) => array.reduce((a, b) => {
  const n1 = Number(a) || null
  const n2 = Number(b[key]) || null

  return n1 + n2
}, 0)

const groupBy = (array, key) => array.reduce((rv, x) => {
  // eslint-disable-next-line no-param-reassign
  (rv[x[key]] = rv[x[key]] || []).push(x)
  return rv
}, {})

const alphanumericSort = (a, b) => {
  const aValue = a[0]
  const bValue = b[0]

  const aIsNumeric = !isNaN(aValue)
  const bIsNumeric = !isNaN(bValue)

  if (aIsNumeric && bIsNumeric) {
    return Number(aValue) - Number(bValue)
  }

  if (aIsNumeric) {
    return -1
  }

  if (bIsNumeric) {
    return 1
  }
  return aValue.localeCompare(bValue)
}


export const Render = () => {
  const [templateData, setData] = useState(null)
  const [htmlCodeInput, setHtmlCodeInput] = useState('')

  // busca os dados do template
  const getTemplate = async (authorization) => {
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
                name
                code
                query
                parent {
                  id
                  name
                }
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
  const getQuery = async (query, variables, authorization) => {
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
        sum,
        groupBy,
        ramda,
        alphanumericSort,
        Decimal,
        moment,
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

  const getVariables = async () => {
    const response = await fetch(`http://localhost:3000/templates/${variablesEndpoint}`)

    const data = await response.json()

    return { query: JSON.stringify(data.query) }
  }

  useEffect(() => {
    const authorization = production ? productionToken : getCookie('development_token')
    const execute = async () => {
      const template = await getTemplate(authorization)
      const variables = await getVariables()
      await getQuery(template.query, variables, authorization)
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
          mountTarget="#mountReport"
          initialContent={initialContent}
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
