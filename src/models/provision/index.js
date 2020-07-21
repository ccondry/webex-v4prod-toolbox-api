const userTemplate = require('./templates/user')
const userProfileTemplate = require('./templates/user-profile')
const upsertUserProfile = require('./user-profile').upsert
const upsertRoutingStrategy = require('./routing-strategy').upsert
const upsertCurrentRoutingStrategy = require('./current-routing-strategy').upsert
const upsertVirtualTeam = require('./virtual-team').upsert
const upsertTeam = require('./team').upsert
const upsertUser = require('./user').upsert

const db = require('../db')

module.exports = {
  go,
  set,
  find,
  setChatDefaults
}

// update provision info in db
async function setChatDefaults (userId) {
  // bubble chat defaults
  const defaults = {
    CiscoAppId: "cisco-chat-bubble-app",
    DC: "produs1.ciscoccservice.com",
    async: true,
    orgId: "ed2f91e1-ce22-4313-85cb-9acd7b5ce489"
  }
  const demo = 'webex-v4prod'
  const query = {
    id: userId
  }
  try {
    // define things to set in user data
    const s = {}
    // set each db property for the user that was sent in their request
    for (const key of Object.keys(defaults)) {
      s[`demo.${demo}.${key}`] = defaults[key]
    }
    // set any parameters in the request body for the webex-v4prod demo
    const updates = {
      $set: s
    }
    // console.log('updating', userId, demo, 'in mongo with', updates)
    const response = await db.updateOne('toolbox', 'users', query, updates)
    return {
      n: response.result.n,
      nModified: response.result.nModified,
      ok: response.result.ok
    }
  } catch (e) {
    throw e
  }
}

// set user provision info in cloud mongo
async function set (data) {
  try {
    // build provision data query
    const q = { username: data.username, demo: 'webex', version: 'v4prod' }
    // build provision data object on top of input data
    const dbData = { demo: 'webex', version: 'v4prod', ...data }
    // check if there is an existing provision record
    const existing = await db.findOne('toolbox', 'provision', q)
    if (existing) {
      // update record
      await db.updateOne('toolbox', 'provision', q, {$set: dbData})
    } else {
      // create new record
      await db.insertOne('toolbox', 'provision', dbData)
    }
  } catch (e) {
    throw e
  }
}

// find user provision info in cloud mongo
async function find (username) {
  try {
    // get user provision data from mongo db
    const q = { username, demo: 'webex', version: 'v4prod' }
    // don't return record id
    const projection = { _id: 0 }
    return db.findOne('toolbox', 'provision', q, {projection})
  } catch (e) {
    throw e
  }
}


// main function block
async function go (dCloudUserId) {
  const teamName = 'T_dCloud_' + dCloudUserId
  // const agentUsername = 'sjeffers' + dCloudUserId + '@dcloud.cisco.com'
  const supervisorUsername = 'rbarrows' + dCloudUserId + '@dcloud.cisco.com'
  const virtualTeamName = 'Q_dCloud_' + dCloudUserId
  // const virtualTeamChatName = 'EP_Chat_' + dCloudUserId
  const routingStrategyName = 'RS_dCloud_' + dCloudUserId
  const userProfileName = 'Supervisor ' + dCloudUserId
  // const supervisorProfileId = 'AWwbV8tvhW2lRXH-xsW8'
  // const agentProfileId = 'AWX8rlaq_1uTFjV88ROQ'

  // voice queue
  const virtualTeam = await upsertVirtualTeam({name: virtualTeamName})

  // chat queue
  // const virtualTeamChat = await upsertVirtualTeam({
  //   name: virtualTeamChatName,
  //   serviceLevelThreshold: 9999,
  //   maxActiveCalls: 4,
  //   channelType: 4
  // })

  // get voice queue ID
  const virtualTeamId = virtualTeam.id

  // get voice queue ID
  // const virtualTeamChatId = virtualTeamChat.id

  // create user profile template
  const upt = userProfileTemplate({
    name: userProfileName,
    queueId: virtualTeamId
  })

  // create user profile
  const userProfile = await upsertUserProfile(upt)

  // get user-specific user profile ID for supervisor
  const supervisorProfileId = userProfile.id

  const team = await upsertTeam(teamName)

  // create user template
  const supervisorUserTemplate = userTemplate({
    username: supervisorUsername,
    teamId: team.id,
    firstName: 'Rick',
    lastName: 'Barrows',
    profileId: supervisorProfileId
  })

  // create user template
  // const agentUserTemplate = userTemplate({
  //   username: agentUsername,
  //   teamId: team.id,
  //   firstName: 'Sandra',
  //   lastName: 'Jefferson',
  //   profileId: agentProfileId
  // })

  // create supervisor
  const supervisor = await upsertUser(supervisorUserTemplate)

  // agent
  // const agent = await upsertUser(agentUserTemplate)

  // extract usable queue ID as a string
  const queueId = virtualTeam.attributes.dbId__l + ''

  // routing strategy
  const routingStrategy = await upsertRoutingStrategy({
    name: routingStrategyName,
    virtualTeamId: virtualTeam.id,
    virtualTeamName,
    virtualTeamDbId: virtualTeam.attributes.dbId__l,
    teamName,
    teamId: team.attributes.dbId__l
  })

  // current routing strategy
  const currentRoutingStrategy = await upsertCurrentRoutingStrategy(routingStrategy)
  // return all objects
  return {
    team,
    supervisor,
    // agent,
    virtualTeam,
    routingStrategy,
    currentRoutingStrategy,
    queueId,
    userProfile
    // virtualTeamChat
  }
}
