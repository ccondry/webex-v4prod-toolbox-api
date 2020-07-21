const express = require('express')
const router = express.Router()
// v2 provision
const model = require('../models/provision')
const cucmModel = require('../models/cucm')

// provision user for CWCC demo
router.post('/', async function (req, res, next) {
  const username = req.user.username
  const userId = req.user.id
  const clientIp = req.clientIp
  const method = req.method
  const path = req.originalUrl
  const operation = 'provision user for Webex v4 demo'

  try {
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'requested')
    // do provisioning in CJP
    await model.go(userId)
    console.log('user', username, userId, 'CWCC provisioning done for Webex v4 demo:')
    // results: {
    //   team,
    //   supervisor,
    //   agent,
    //   virtualTeam,
    //   routingStrategy,
    //   queueId
    // }

    console.log('marking user', username, userId, 'as provisioned but not done for Webex v4')
    // mark user provisioned but not done in our cloud db
    await model.set({username, id: userId, isDone: false})
    
    
    console.log('setting user', username, userId, 'default bubble chat parameters')
    // set default bubble chat settings
    await model.setChatDefaults(userId)

    console.log('sending CUCM provision request to Webex v4 demo session...')
    // forward the JWT to the CUCM inside the demo session
    await cucmModel.post(req.headers.authorization)
    console.log('CUCM provision request to Webex v4 demo session sent successfully')

    // return 200 OK
    return res.status(200).send()
  } catch (e) {
    // error
    console.log('user', username, userId, 'at IP', clientIp, operation, method, path, 'error', e.message)
    // return 500 SERVER ERROR
    res.status(500).send(e.message)
  }
})

module.exports = router
