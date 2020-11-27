# Getir Case Assessment

This application has only one route i-e a POST request

https://getir-rameez-test.herokuapp.com/api/v1/get/records


### API Endpoint Information - /getRecords
https://getir-rameez-test.herokuapp.com/api/v1/get/records


### Postman Collection link


POST /api/v1/get/records
Host: https://getir-rameez-test.herokuapp.com
Content-Type: application/json
{
  "startDate": "2016-01-26",
  "endDate": "2018-02-02",
  "minCount": 2700,
  "maxCount": 3000
}

## Response
{
  "code":0,
  "msg":"Success",
  "records":[
    {
    "key":"TAKwGc6Jr4i8Z487",
    "createdAt":"2017-01-28T01:22:14.398Z",
    "totalCount":2800
    },
    {
    "key":"NAeQ8eX7e5TEg7oH",
    "createdAt":"2017-01-27T08:19:14.135Z",
    "totalCount":2900
    }
  ]
}

#### Success Response Payload
`{ code : 0, msg : "success", records: data }` |

  

