export const initialContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        @media print {
          .print {
            display: none;
          }

          .params {
            display: none;
          }

          .break_page {
            display: block;
            page-break-after: always;
          }
          #expand_collapse {
            display: none !important;
          }

          .negative,
          .negative .money {
            color: #000;
          }
        }

        a:link,
        a:visited,
        a:hover,
        a:active {
          color: #000;
          text-decoration: none;
          font-style: normal;
        }

        body {
          background: #fff;
          color: #333;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          margin: 0;
          padding: 0;
        }

        h1,
        h2 {
          font-weight: bold;
          margin: 0;
        }

        h1 {
          font-size: 20px;
          line-height: 25px;
          text-align: center;
          margin-right: 20%;
        }

        h2 {
          font-size: 16px;
          line-height: 25px;
          padding-top: 10px;
        }

        h3 {
          font-size: 14px;
          line-height: 18px;
          margin: 0 0 6px;
          padding-top: 5px;
        }

        p {
          margin-top: 0;
        }

        ul li ul {
          margin-left: 10px;
        }

        ul {
          list-style: none;
          padding: 0;
          overflow: hidden;
        }

        li,
        dd {
          font-weight: bold;
          float: left;
          margin: 0 5px 0 0;
          padding: 0 5px 5px 0;
        }

        ul,
        dl {
          margin: 6px 0;
        }

        dt,
        dd {
          display: inline;
          float: none;
        }

        dd {
          margin: 0 5px;
        }

        ol {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        ol li {
          border-left: 1px solid #999;
          color: #000;
          font-size: 11px;
          margin: 0;
          padding: 5px;
          text-align: center;
          text-transform: uppercase;
          white-space: nowrap;
        }

        table {
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 12px;
          margin-bottom: 10px;
          width: 100%;
          padding: 20px 20px 20px 20px;
        }

        table .fixed th {
          border-top: 1px solid #999;
          border-bottom: 1px solid #999;
          border-right: 1px solid #999;
        }

        table .fixed td {
          border-bottom: 1px solid #999;
          border-right: 1px solid #999;
        }

        table .fixed th:first-child,
        table .fixed td:first-child {
          border-left: 1px solid #999;
        }

        thead {
          display: table-header-group;
        }

        tbody {
          display: table-row-group;
        }

        .fixed {
          position: -webkit-sticky;
          position: sticky;
          top: 0;
          z-index: 1;
          background-color: #fff;
        }

        table,
        th,
        td {
          color: #000;
          font-size: 11px;
          line-height: 1.25em;
          padding-top: 2px;
          padding-bottom: 2px;
        }

        th td {
          border: 1px solid #999;
          padding: 2px;
          text-align: left;
        }

        td {
          border: 1px solid #bfbfbf;
          padding: 5px;
          text-align: left;
          vertical-align: top;
        }

        td ul li {
          float: none;
        }

        td p {
          margin: 0;
          padding: 0;
        }

        .obs_after_grid td {
          border: 0;
          padding: 0;
        }

        /* ============== CabeÃ§alho - BotÃĩes ============== */

        .print {
          background: #417ac0;
          border-bottom: 1px solid #666;
          margin: 0 0 20px;
          padding: 20px;
          text-align: center;
        }

        .print a,
        .btnPrint {
          background: #f5f5f5;
          border: 1px solid #666;
          border-radius: 3px;
          font-style: normal;
          font-weight: bold;
          padding: 5px 20px;
          text-transform: uppercase;
        }

        .print a:hover,
        .btnPrint:hover {
          background: #999;
          border: 1px solid #fff;
          color: #fff;
        }

        /* ============== Links - Detalhamento ============= */

        .reports_link a {
          color: #417ac0;
          font-weight: bold;
        }

        .reports_link a:hover,
        a:active {
          color: #1155cc;
          text-decoration: underline;
        }

        /* ============== Container Principal ============= */

        .container,
        .wrapper {
          margin: 0 auto;
          text-indent: 20px;
        }

        /* ============== RodapÃĐ ============== */
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          font-size: 10px;
          border-top: 1px solid black;
          margin-left: 20px;
          margin-right: 20px;
          display: block;
          bottom: 0;
        }

        .footer ul li {
          float: left;
          margin: 0 10px 0 0;
          padding: 0 10px 10px 0;
        }

        .footer tr td {
          border: none;
          vertical-align: middle;
          font-size: 10px;
          text-align: right;
        }

        /* ============== Gerais de RelatÃģrio ============= */

        th.label,
        th {
          background-color: #bfbfbf;
          border: 1px solid #999;
          font-size: 11px;
          height: 13px;
          padding: 5px;
          text-align: center;
          text-transform: uppercase;
          white-space: nowrap;
          width: auto;
        }

        .h1_title {
          font-size: 20px;
          font-weight: bold;
          line-height: 25px;
          margin: 0;
          text-align: center;
        }

        .centered {
          margin-bottom: 55px;
          margin-top: -70px;
        }

        .h3_style {
          margin-bottom: 55px;
          margin-top: -50px;
        }

        .highlight_all_lines tr:hover,
        .even:hover,
        .odd:hover {
          background: #fef2a0;
        }
        .even:hover .money_total_all,
        .odd:hover .money_total_all {
          background: #e8dc86;
        }

        .even,
        .no-hover .even {
          background-color: #f2f2f2;
        }

        .odd,
        .no-hover .odd {
          background-color: #fff;
        }

        .even_two {
          background-color: #f2f2f2;
        }

        .odd_two {
          background-color: #fff;
        }

        .bold,
        .bold_footer {
          font-weight: bold;
        }

        .uppercase {
          text-transform: uppercase;
        }

        .min_width_30 {
          min-width: 30px;
        }

        .min_width_50 {
          min-width: 50px;
        }

        .min_width_70 {
          min-width: 70px;
        }

        .min_width_80 {
          min-width: 80px;
        }

        .min_width_200 {
          min-width: 200px;
        }

        .min_width_360 {
          min-width: 360px;
        }

        .min_width_400 {
          min-width: 400px;
        }

        .date {
          width: 60px;
        }

        .total {
          background-color: #f2f2f2;
          text-transform: uppercase;
        }

        .total .right,
        .right {
          text-align: right;
        }

        .subtotal td {
          text-transform: capitalize;
        }

        .money,
        .money_unrealized,
        .money_total,
        .money_diff,
        .money_total_all,
        .total,
        .money_footer,
        .money_cell,
        .money_header td {
          text-align: right;
          white-space: nowrap;
        }
        .money_cell_center,
        .money_footer_center {
          text-align: center;
          white-space: nowrap;
        }
        .nowrap {
          white-space: nowrap;
        }
        .negative,
        .negative .money {
          color: red;
        }

        .line_group,
        .line_group_featured,
        .line_group_featured_2,
        .line_group_featured_3,
        .line_group_featured_4 {
          width: auto;
          text-transform: uppercase;
          white-space: nowrap;
          border: 1px solid #999;
          font-weight: bold;
          border-bottom: 2px solid #999;
        }

        .line_group_featured_no_border_bottom {
          border-bottom: none;
        }

        .nowrap {
          white-space: nowrap;
        }

        .valign_middle {
          vertical-align: middle;
        }

        .line_group_featured {
          background-color: #d9d9d6;
          white-space: normal;
        }

        .line_group_featured_2 {
          background-color: #accdda;
        }

        .line_group_featured_3 {
          background-color: #d9d9d6;
          font-size: 14px;
        }

        .line_group_featured_4 {
          background-color: #f2f2f2;
        }

        .money_unrealized {
          color: #999999;
        }

        .money_diff {
          color: #6c6c6c;
        }

        .money_total {
          background-color: #f2f2f2;
        }

        .column_sequence {
          width: 20px;
        }

        .column_50 {
          width: 50px;
        }

        .column_60 {
          width: 50px;
        }

        .column_80 {
          width: 80px;
        }

        .column_90 {
          width: 80px;
        }

        .column_100 {
          width: 100px;
        }

        .column_110 {
          width: 120px;
        }

        .column_150 {
          width: 150px;
        }

        .column_200 {
          width: 200px;
        }

        .td_label_30 {
          width: 30px;
        }

        .td_label_70 {
          width: 70px;
        }

        .td_label_80 {
          width: 80px;
        }

        .td_label_100 {
          width: 100px;
        }

        .td_label_110 {
          width: 110px;
        }

        .td_label_120 {
          width: 200px;
        }

        .td_label_350 {
          width: 350px;
        }

        .td_label_30,
        .td_label_70,
        .td_label_80,
        .td_label_100,
        .td_label_110,
        .td_label_120,
        .td_label_350,
        .td_label {
          text-transform: uppercase;
          white-space: nowrap;
          font-weight: bold;
          text-align: right;
          background-color: #f2f2f2;
          vertical-align: middle;
        }

        .calc_rule {
          text-align: right;
          white-space: nowrap;
          width: 100px;
        }

        .alert_icon {
          padding-left: 40px;
          position: relative;
        }
        .alert_icon:before {
          background: url("/resources/images/icons/produto_igual_di.png") no-repeat;
          content: "";
          display: inline-block;
          height: 18px;
          left: 10px;
          position: absolute;
          top: calc(50% - 8px);
          vertical-align: middle;
          width: 16px;
        }

        .description {
          white-space: normal;
        }

        .logo_header {
          height: 117px;
          width: 170px;
          text-align: center;
          margin-right: 20px;
        }

        .table_header td {
          border: none !important;
          vertical-align: middle;
          padding-left: 0px;
        }

        .align_left {
          font-size: 20px;
          font-weight: bold;
          line-height: 25px;
          margin: 0;
          text-align: left;
        }

        .logo {
          height: 117px;
          line-height: 155px;
          text-align: center;
          vertical-align: middle;
          width: 170px;
        }

        .table_lines {
          font-size: 10px;
          font-style: italic;
          margin-top: 0;
        }

        .additional_information {
          background-color: #dcdcdc;
        }

        .frostbite {
          background-color: #bfbfbf;
          border-top: 1px solid #999;
          height: 23px;
          position: absolute;
          z-index: 1;
        }

        .thead_frozen {
          background-color: #bfbfbf;
          border: 1px solid #999;
          display: none;
          height: 22px;
          left: 40px;
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 1;
        }

        .on_top .th_frozen {
          background-color: #bfbfbf;
          border-left: 1px solid #999;
          display: block;
          margin-left: -6px;
          margin-top: 1px;
          min-height: 12px;
          padding: 5px 5px 3px;
          position: fixed;
          top: 0;
          z-index: 1;
        }

        .on_top .th_frozen_rowspan_2 {
          min-height: 36px;
        }

        #thead_frozen_1,
        .on_top .tr_frozen_1 .th_frozen {
          top: 22px;
        }

        /* ============== Fluxo de caixa ============= */
        .money_total_positive {
          color: green;
          text-align: right;
          background-color: #f2f2f2;
        }

        .money_total_negative {
          color: red;
          text-align: right;
          background-color: #f2f2f2;
        }

        .plan_accounts_origin {
          background-color: #f2f2f2;
          font-weight: bold;
        }

        .plan_account_desc {
          min-width: 120px;
          white-space: nowrap;
        }

        .money_total_all {
          background-color: #dddddd;
        }

        /* ============== Visualizar NF ============== */

        .autorizada,
        .terceiros,
        .cancelada,
        .cartacorrecao,
        .fornecedor,
        .denegada {
          padding: 10px;
          margin: 10px;
          border: 2px solid;
        }

        .terceiros {
          background-color: #d0f0f9;
          border-color: #9ad7ed;
        }

        .autorizada {
          background-color: #d9f4d9;
          border-color: #2db200;
        }

        .denegada {
          background-color: #ffe1b8;
          border-color: #f2a800;
        }

        .cancelada {
          background-color: #ffe0e0;
          border-color: #ff7373;
        }

        .cartacorrecao {
          background-color: #ffefbf;
          border-color: #ffd24d;
        }

        .fornecedor {
          background-color: #c0e2f9;
          border-color: #2891da;
        }

        /* ============== Etiquetas ================== */

        .stamps div {
          line-height: normal;
        }

        /* ============== Livro de Controle ========== */

        .center {
          text-align: center;
        }

        .break_page {
          display: none;
        }

        /* ============== Financeiro ================= */

        .cost_center,
        .customs_clearance_number,
        .payment_mean,
        .bank_account {
          white-space: nowrap;
        }

        /* ============== Fluxo de Caixa Resumido ==== */

        .receitas {
          background-color: #d5eed4;
        }

        .despesas {
          background-color: #ffece7;
        }

        .resultados {
          background-color: #d1e3ea;
        }

        /*============== Extrato de pedido de compra ================ */
        .no_border th,
        .no_border td,
        .table_status th,
        .table_status td {
          border-collapse: collapse;
          border: none !important;
        }

        .no_border th,
        .no_border td {
          padding: 0px;
        }

        .table_right {
          border: none;
          float: right;
          position: absolute;
          right: 40px;
          text-align: right;
          top: 165px;
          width: 25%;
        }

        .table_right th,
        .table_right td {
          border-collapse: collapse;
          border: none !important;
          padding: 0px;
          font-size: 18px;
          line-height: 25px;
        }

        .row {
          border-bottom: 1px groove #000000;
          margin: 7px 0px 7px 0px;
        }

        /* relatÃģrio assÃ­ncrono */

        .wait {
          background: url("/extjs/resources/neptune/images/loadmask/loading.gif");
          background-position: center 7px;
          background-repeat: no-repeat;
          font-size: 15px;
          color: #777;
          background-color: #eee;
          text-align: center;
          margin-top: 20px;
          padding: 25px 0 10px 0;
          border-radius: 5px;
        }

        .error {
          background-position: center 7px;
          background-repeat: no-repeat;
          font-size: 15px;
          color: #777;
          background-color: #eee;
          text-align: center;
          margin-top: 20px;
          padding: 10px 0 10px 0;
          border-radius: 5px;
        }

        .status_box {
          border-radius: 3px;
          padding: 2px 6px;
        }

        .blue {
          background-color: #3f92dd;
        }

        .light-gray-blue {
          background-color: #aecddc;
        }

        .gray-blue {
          background-color: #a0bccb;
        }

        .light-blue {
          background-color: #accdda;
        }

        .medium-blue {
          background-color: #6bc1dd;
        }

        .turquoise-blue {
          background-color: #6fd1ff;
        }

        .gray {
          background-color: #bfc0ba;
        }

        .green {
          background-color: #7fc58c;
        }

        .light-green {
          background-color: #daebd9;
        }

        .clearly-green {
          background-color: #daebd7;
        }

        .acqua-light-green {
          background-color: #cfe3e3;
        }

        .ochre-green {
          background-color: #d7ebdc;
        }

        .acqua-green {
          background-color: #bce8d7;
        }

        .dirt-green {
          background-color: #d4e0cc;
        }

        .red {
          background-color: #f69191;
        }

        .light-red {
          background-color: #f29290;
        }

        .yellow {
          background-color: #f6c000;
        }

        .clearly-yellow {
          background-color: #fff5af;
        }

        .ultra-clearly-yellow {
          background-color: #ffff99;
        }

        .sun-yellow {
          background-color: #ffff26;
        }

        .dark-yellow {
          background-color: #f2a800;
        }

        .light-yellow {
          background-color: #f7e329;
        }

        .midfielder-yellow {
          background-color: #f5d65c;
        }

        .light-rose {
          background-color: #f4d4cc;
        }

        .rose {
          background-color: #ffcfbf;
        }

        /*============== Products ================ */

        .product-description {
          min-width: 300px;
        }

        /*============== Expand/Collapse ================ */

        #expand_collapse {
          background: none;
          border: 0;
          display: none;
          text-align: left;
          padding: 10px 0 0;
        }

        #expand_collapse a {
          cursor: pointer;
        }
        .is_dad td:first-child span {
          display: inline-block;
          padding-left: 20px;
          position: relative;
          vertical-align: top;
        }

        .is_dad {
          cursor: pointer;
        }
        .is_dad td:first-child span:before {
          background-color: #417ac0;
          border-radius: 2px;
          color: #fff;
          content: "+";
          display: inline-block;
          font-size: 12px;
          font-weight: normal;
          left: 0;
          padding-top: 1px;
          position: absolute;
          text-align: center;
          vertical-align: middle;
          width: 15px;
        }
        .is_dad.expanded_dad td:first-child span:before {
          content: "-";
        }
        .has_one_child .is_dad.expanded td {
          /* has_one_child */
          background-color: #d1e3ea;
          border-top-width: 2px;
        }
        .is_dad.expanded td {
          background-color: #d1e3ea;
          border-top-width: 2px;
        }
        .is_child {
          background-color: #d1e3ea;
          display: none;
        }
        .child_color td {
          color: #777;
        }
        .is_child.expanded_child {
          display: table-row;
        }
        .has_one_child tr.expanded td:first-child {
          /* has_one_child */
          border-left-width: 2px;
        }
        .has_one_child tr.expanded td:last-child {
          /* has_one_child */
          border-right-width: 2px;
        }
        .last_line_dad.expanded td,
        .last_line_child.expanded td {
          border-bottom-width: 2px;
        }
        .child-description {
          font-weight: normal;
          padding-left: 25px;
        }
        .head_child .child-description {
          background-color: #b7d3e0;
          font-weight: bolder;
          padding-left: 5px;
          text-align: center;
          text-transform: uppercase;
          vertical-align: middle;
        }
        .show_forever {
          display: table-row !important;
        }

        .level_1 td:first-child {
          padding-left: 10px;
        }
        .level_2 td:first-child {
          padding-left: 20px;
        }
        .level_3 td:first-child {
          padding-left: 30px;
        }
        .level_4 td:first-child {
          padding-left: 40px;
        }
        .level_5 td:first-child {
          padding-left: 50px;
        }
        .level_6 td:first-child {
          padding-left: 60px;
        }
        .level_7 td:first-child {
          padding-left: 70px;
        }
        .level_8 td:first-child {
          padding-left: 80px;
        }
        .level_9 td:first-child {
          padding-left: 90px;
        }
        .level_10 td:first-child {
          padding-left: 100px;
        }

        .table_levels .level_1 {
          background-color: #cfcfcf;
        }
        .table_levels .level_2 {
          background-color: #e3e3e3;
        }
        .table_levels .level_3 {
          background-color: #f2f2f2;
        }
        .table_levels .level_4,
        .table_levels .level_5,
        .table_levels .level_6,
        .table_levels .level_7,
        .table_levels .level_8,
        .table_levels .level_9,
        .table_levels .level_10 {
          background-color: #fff;
        }

        .table-head-line-2 {
          min-width: 45px;
        }

        /*============== DRE ================ */

        #alert_user_config {
          background-color: #f3e6e6;
          color: #ec3939;
          font-size: 13px;
          margin: 20px 0;
          padding: 10px;
        }
        #alert_user_config p {
          line-height: 140%;
          margin-bottom: 0;
        }

        .td_with_items {
          padding-right: 0;
          padding-left: 0;
        }

        .td_with_items span {
          border-top: 1px solid #bfbfbf;
          padding: 5px;
          display: block;
        }

        .td_with_items span:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .min_width_if_nil {
          min-width: 40px;
        }

        .final_message {
          font-size: 0.9em;
          margin-bottom: 0;
          margin-top: 30px;
          text-align: center;
        }

        .table_min_height {
          min-height: 49px;
        }

        .grid_list_1 {
          margin-left: 20px;
        }
        table.grid_list_1 {
          width: calc(100% - 20px);
        }
        .grid_list_2 {
          margin-left: 40px;
        }
        table.grid_list_2 {
          width: calc(100% - 40px);
        }
        .grid_list_3 {
          margin-left: 60px;
        }
        table.grid_list_3 {
          width: calc(100% - 60px);
        }

        /* === COMERCIAL INVOICE === */
        .min_width_400_label {
          min-width: 400px;
          background-color: #bfbfbf;
          border: 1px solid #999;
          font-size: 11px;
          height: 13px;
          padding: 5px;
          text-align: center;
          text-transform: uppercase;
          white-space: nowrap;
          width: auto;
          font-weight: bold;
        }

        .max_width_50 {
          max-width: 50px;
          word-break: break-all;
        }

        .div_left {
          width: 40%;
          float: left;
        }

        .div_right {
          width: 40%;
          float: right;
        }

        .signature {
          border-top: 1px solid black;
          margin-top: 100px;
          text-align: center;
        }

        .stamp {
          margin-bottom: -100px;
        }

        .signatures {
          position: relative;
          width: 100%;
        }

        .signature_stamp {
          margin-top: 100px;
        }

        .infos_right {
          float: right;
          font-weight: bold;
          position: absolute;
          right: 40px;
          text-align: right;
          top: 90px;
          width: 25%;
          font-size: 12px;
        }

        .infos_right_without_logo {
          text-align: right;
          float: right;
          margin-top: -60px;
          font-size: 12px;
          margin-bottom: 40px;
        }

        .div_center {
          text-align: center;
          margin-left: 25%;
          width: 50%;
          padding-top: 5px;
          clear: right;
        }

      </style>
    </head>
    <body>
      <div id="mountReport"></div>
    </body>
  </html>
`
