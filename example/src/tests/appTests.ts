import RNFS from 'react-native-fs'

import { Test, assert, createClients, delayToPropogate } from './test-utils'
import { Client, Group } from '../../../src/index'

export const appTests: Test[] = []
let counter = 1
function test(name: string, perform: () => Promise<boolean>) {
  appTests.push({
    name: String(counter++) + '. ' + name,
    run: perform,
  })
}

test('can stream and update name without forking group', async () => {
  const [alix, bo] = await createClients(2)
  console.log('created clients')

  const firstMsgCheck = 2
  const secondMsgCheck = 5


  //#region Stream All Messages
  await bo.conversations.streamAllMessages(async () => {
    console.log('message received')
  }, true)
  //#endregion
  // #region create group
  const alixGroup = await alix.conversations.newGroup([bo.address])
  await alixGroup.updateGroupName('hello')
  await alixGroup.send('hello1')
  console.log('sent group message')
  // #endregion
  // #region sync groups
  await bo.conversations.syncGroups()
  // #endregion
  const boGroups = await bo.conversations.listGroups()
  assert(boGroups.length === 1, 'bo should have 1 group')
  const boGroup = boGroups[0]
  await boGroup.sync()

  // assert(await alixGroup.groupName() === 'hello', 'alix group name should be hello')
  // assert(await boGroup.groupName() === 'hello', 'bo group name should be hello')

  const boMessages1 = await boGroup.messages()
  assert(
    boMessages1.length === firstMsgCheck,
    `should have 2 messages on first load received ${boMessages1.length}`
  )
  await boGroup.send('hello2')
  await boGroup.send('hello3')
  await alixGroup.sync()
  const alixMessages = await alixGroup.messages()
  for (const message of alixMessages) {
    console.log(
      'message',
      message.contentTypeId,
      message.contentTypeId === 'xmtp.org/text:1.0'
        ? message.content()
        : 'Group Updated'
    )
  }
  // alix sees 3 messages
  assert(
    alixMessages.length === secondMsgCheck,
    `should have 5 messages on first load received ${alixMessages.length}`
  )
  await alixGroup.send('hello4')
  await boGroup.sync()
  const boMessages2 = await boGroup.messages()
  for (const message of boMessages2) {
    console.log(
      'message',
      message.contentTypeId,
      message.contentTypeId === 'xmtp.org/text:1.0'
        ? message.content()
        : 'Group Updated'
    )
  }
  // bo sees 4 messages
  assert(
    boMessages2.length === secondMsgCheck,
    `should have 5 messages on second load received ${boMessages2.length}`
  )
  return true
})
