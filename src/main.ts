import { graphql } from "@octokit/graphql";
import { GITHUB_TOKEN } from "./constants";
import ExcelJS from 'exceljs';
import fs from 'fs';

const gh_token = GITHUB_TOKEN;

const graphqlWithAuth = graphql.defaults({
    headers: {
        authorization : `token ${gh_token}`
    }
})

type GetDataProps = {
  hasNextPage : boolean,
  afterCursor : string
}

const getQuery = (props: GetDataProps) => {
  return `query MyQuery {
    repository(name: "NeoAlgo", owner: "TesseractCoding") {
      pullRequests(first: 100, labels: "gssoc21" ${props.hasNextPage ? `,after:\"${props.afterCursor}\"` : ""}) {
        nodes {
          author {
            ... on User {
              id
              login
              name
            }
          }
          createdAt
          merged
          mergedAt
          mergedBy {
            ... on User {
              id
              name
              login
            }
          }
          id
          title
          url
          labels(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }`;
}

async function getData (query : string) {
  const { repository } = await graphqlWithAuth(query)
  return repository
}

const pull_request_data : any[] = <any>[]

const initialQuery = getQuery({hasNextPage: false, afterCursor: ''});
// console.log(`initial Query: ${initialQuery}`);
getData(initialQuery).then(async (data) => {
  pull_request_data.push(data.pullRequests.nodes)
  console.log(JSON.stringify(data.pullRequests.nodes[0]))

  let hasNextPage = data.pullRequests.pageInfo.hasNextPage;
  while(hasNextPage === true){
    const newQuery = getQuery({hasNextPage: true, afterCursor: data.pullRequests.pageInfo.endCursor});
    // console.log(`new Query: ${newQuery}`);
    const newData = await getData(newQuery);
    pull_request_data.push(...newData.pullRequests.nodes)
    console.log(JSON.stringify(newData.pullRequests.nodes[0]))
    console.log(`Current blob size ${pull_request_data.length}`)
    hasNextPage = newData.pullRequests.pageInfo.hasNextPage;
    data = newData;
  }

  const fileToWrite = fs.createWriteStream('pr_data.txt');
  fileToWrite.write(JSON.stringify( pull_request_data))
  fileToWrite.close()
},(err) => {
    console.log(err)
});

// const workbook = new ExcelJS.Workbook()
// workbook.creator = 'Ganesh Tiwari'
// workbook.created = new Date()

// const neoalgoStats = workbook.addWorksheet('NeoAlgo Stats')
// neoalgoStats.addTable(
//   { 
//     headerRow: true, 
//     name: 'Stats', 
//     columns: [
//       { name: 'Created At' ,}, 
//       { name: 'URL for the PR' },
//       { name: 'Created By[UserName]' },
//       { name: 'Created By[Name]' },
//       { name: 'PR Title' },
//       { name: 'Created At' },
//       { name: 'Merged Successfully' },
//       { name: 'Merged At' },
//       { name: 'Merged By[username]' },
//       { name: 'Merged By[Name]' },
//       { name: 'Merged By[username]' },
//       { name: 'Labels Attached' },
//     ], 
//     rows: [[]], 
//     ref: 'Top cell' 
//   }
// )
// workbook.xlsx.writeFile('newWorkbook.xlsx')
