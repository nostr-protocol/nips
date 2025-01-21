 // Constants
    let currentRelay;
    // Get DOM Elements
     const relayUrlInput = document.getElementById('relayUrlInput');
     const connectRelayBtn = document.getElementById('connectRelayBtn');
    const privateKeyInput = document.getElementById('privateKeyInput');
   const pubkeysInput = document.getElementById('pubkeysInput');
    const contentInput = document.getElementById('contentInput');
     const publishEventBtn = document.getElementById('publishEventBtn');
    const eventsDiv = document.getElementById('events');
      const logsDiv = document.getElementById('logs');
        const notificationsDiv = document.getElementById('notifications');
    const ipfsModal = document.getElementById('contentModal');
   const ipfsModalContent = document.getElementById('modalContent')
   const ipfsModalClose = document.getElementById('closeModal')
      let pubkey;
      let privateKey;
      let currentEvents = [];
       let currentNotifications = [];
    const ipfsGateway = "https://ipfs.copylaradio.com";
    const ipfsAPI = "https://ipfs.libra.copylaradio.com";
    function log(message) {
         const logsDiv = document.getElementById('logs');
              console.log(message);
             logsDiv.innerHTML += message + '<br>';
       }
  function loadApp(){
        loadSettings()
          ipfsModalClose.addEventListener('click', () => closeModal())
    // connect relay
     connectRelayBtn.addEventListener('click', async function() {
        const relayUrl = relayUrlInput.value;
         if (!relayUrl){
            log("Please provide a valid relay url");
            return;
         }
       try {
           log(`Connecting to relay ${relayUrl}`);
           await connectToRelay(relayUrl);
             log('Connected to relay successfully.');
               await saveSettings()
           await subscribeToEvents();
          }
        catch(error){
             log(`Error with relay connection: ${error.message}`);
        }
    });
   async function connectToRelay(relayUrl) {
     if (currentRelay){
              currentRelay.close();
            }
        currentRelay = new window.nostr.Relay(relayUrl);
           currentRelay.on('connect', () => {
               log(`connected to relay ${relayUrl}`)
          });
           currentRelay.on('error', (e)=> log(`relay error ${e.message}`));
        await currentRelay.connect();
  }
    async function subscribeToEvents() {
          if (!currentRelay)
               {
                log("Relay is not connected");
                 return;
            }
        let pubkeys = pubkeysInput.value.split(',').map(pk => pk.trim()).filter(pk => pk !== '');
      const filters = {
            kinds: [10037, 10038],
             limit: 100
      };
     if (pubkeys.length > 0) {
        filters.authors = pubkeys
      }
        const sub =  currentRelay.subscribe([filters]);
        sub.on('event', handleEvent);
        log("Listening for events...")
    }
     function handleEvent(evt) {
            log(`Event received with ID ${evt.id}`);
       if (evt.kind === 10037)
            {
                handleNostrReActionEvent(evt)
            }
        else if (evt.kind === 10038) {
               handleNotificationEvent(evt)
            }
     }
     function handleNostrReActionEvent(evt){
       const existingEventIndex = currentEvents.findIndex(e => e.id === evt.id);
        if (existingEventIndex !== -1)
          {
            log(`Event already exist with ID ${evt.id}, update`);
            currentEvents[existingEventIndex] = evt;
         }
       else {
            log(`Adding new event with ID ${evt.id}`);
             currentEvents.push(evt);
        }
         currentEvents.sort((a, b) => b.created_at - a.created_at)
         renderEvents()
    }
     function handleNotificationEvent(evt) {
         const existingNotificationIndex = currentNotifications.findIndex(e => e.id === evt.id);
        if (existingNotificationIndex !== -1)
          {
            log(`Notification already exist with ID ${evt.id}, update`);
            currentNotifications[existingNotificationIndex] = evt;
         }
       else {
            log(`Adding new notification with ID ${evt.id}`);
             currentNotifications.push(evt);
        }
       currentNotifications.sort((a, b) => b.created_at - a.created_at)
       renderNotifications()
     }
      function renderEvents() {
           eventsDiv.innerHTML = '';
          for(const event of currentEvents) {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event bg-white p-4 rounded shadow';
             let content = event.content
              let ipfsCid = event.tags.find(tag => tag[0]==='ipfs_cid')?.[1];
             if (ipfsCid){
                const contentButton = document.createElement('button');
                contentButton.textContent = 'Show IPFS Content' ;
                  contentButton.className = "text-blue-500";
                 contentButton.addEventListener('click', () => displayIPFSContent(ipfsCid));
                   eventDiv.appendChild(contentButton)
                }
             const tagsString = JSON.stringify(event.tags);
             eventDiv.innerHTML +=`
                 <p class="font-bold">Kind:</p>
                 <p> ${event.kind}</p>
                  <p class="font-bold">Pubkey:</p>
                 <p>${event.pubkey}</p>
                 <p class="font-bold">Content:</p>
                 <p>${content}</p>
                 <p class="font-bold">Tags:</p>
                <p>${tagsString}</p>
              `;
           if (event.kind === 10037) {
                      eventDiv.appendChild(createActionButtons(event))
                  }
             eventsDiv.prepend(eventDiv);
         }
    }
      function renderNotifications() {
            notificationsDiv.innerHTML = '';
          for(const event of currentNotifications) {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event bg-white p-4 rounded shadow';
             const tagsString = JSON.stringify(event.tags);
             eventDiv.innerHTML +=`
                 <p class="font-bold">Kind:</p>
                 <p> ${event.kind}</p>
                  <p class="font-bold">Pubkey:</p>
                 <p>${event.pubkey}</p>
                 <p class="font-bold">Tags:</p>
                <p>${tagsString}</p>
              `;
              notificationsDiv.prepend(eventDiv);
         }
    }
// Create button actions
    function createActionButtons(sourceEvent) {
        const actionDiv = document.createElement('div');
         actionDiv.className = 'action mt-4 flex space-x-2';
        const likeBtn = document.createElement('button');
          likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Like';
           likeBtn.className =" bg-blue-500 text-white px-4 py-2 rounded"
            likeBtn.addEventListener('click', () => sendNostrReAction('like', sourceEvent));
        actionDiv.appendChild(likeBtn);
       const modifyBtn = document.createElement('button');
          modifyBtn.textContent = 'Modify';
          modifyBtn.className ="bg-gray-500 text-white px-4 py-2 rounded"
         modifyBtn.addEventListener('click', () => openModifyModal(sourceEvent));
         actionDiv.appendChild(modifyBtn);
         const replyBtn = document.createElement('button');
          replyBtn.textContent = 'Reply';
          replyBtn.className ="bg-green-500 text-white px-4 py-2 rounded"
         replyBtn.addEventListener('click', () => openReplyModal(sourceEvent));
         actionDiv.appendChild(replyBtn);
        const validateBtn = document.createElement('button');
        validateBtn.textContent = 'Validate';
       validateBtn.className ="bg-green-500 text-white px-4 py-2 rounded"
        validateBtn.addEventListener('click', () => sendNostrReAction('validate', sourceEvent));
        actionDiv.appendChild(validateBtn);
           const refuseBtn = document.createElement('button');
         refuseBtn.textContent = 'Refuse';
          refuseBtn.className ="bg-red-500 text-white px-4 py-2 rounded"
         refuseBtn.addEventListener('click', () => sendNostrReAction('refuse', sourceEvent));
         actionDiv.appendChild(refuseBtn);
         return actionDiv;
   }
    // Modal to modify
    function openModifyModal(sourceEvent) {
       const modal = document.createElement('div')
       modal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
           <div style="background: #fff; padding: 20px; border-radius: 5px; width: 80%; max-width: 600px;">
                <h2 class="text-xl font-semibold mb-4">Modify Event</h2>
                <textarea id="modifyText" style="width:100%; height: 100px; border: 1px solid #ddd; margin-bottom: 10px; padding: 8px;"></textarea>
               <button id="sendModifyBtn" class="bg-blue-500 text-white px-4 py-2 rounded mt-2">Send Modify</button>
                <button id="closeModifyBtn"  class="bg-gray-400 text-white px-4 py-2 rounded mt-2">Close</button>
           </div>
         </div>`
       document.body.appendChild(modal);
      const sendModifyBtn = document.getElementById('sendModifyBtn')
       const closeModifyBtn = document.getElementById('closeModifyBtn')
        sendModifyBtn.addEventListener('click', async function() {
           const modifyText = document.getElementById('modifyText').value;
           document.body.removeChild(modal)
           await sendNostrReAction('modify', sourceEvent, null, modifyText);
         })
        closeModifyBtn.addEventListener('click',  () => {
              document.body.removeChild(modal)
       })
    }
    // Modal for Reply
    function openReplyModal(sourceEvent) {
         const modal = document.createElement('div')
       modal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
           <div style="background: #fff; padding: 20px; border-radius: 5px; width: 80%; max-width: 600px;">
                <h2 class="text-xl font-semibold mb-4">Reply Event</h2>
                <textarea id="replyText" style="width:100%; height: 100px; border: 1px solid #ddd; margin-bottom: 10px; padding: 8px;"></textarea>
               <button id="sendReplyBtn" class="bg-blue-500 text-white px-4 py-2 rounded mt-2">Send Reply</button>
                <button id="closeReplyBtn"  class="bg-gray-400 text-white px-4 py-2 rounded mt-2">Close</button>
           </div>
         </div>`
       document.body.appendChild(modal);
      const sendReplyBtn = document.getElementById('sendReplyBtn')
       const closeReplyBtn = document.getElementById('closeReplyBtn')
        sendReplyBtn.addEventListener('click', async function() {
           const replyText = document.getElementById('replyText').value;
           document.body.removeChild(modal)
           await sendNostrReAction('reply', sourceEvent, replyText);
         })
        closeReplyBtn.addEventListener('click',  () => {
              document.body.removeChild(modal)
       })
    }
    // send nostr action
    async function sendNostrReAction(actionType, sourceEvent,  replyText = null, modifyText = null) {
        let myPrivateKey = privateKeyInput.value
         if (!myPrivateKey){
            if (!window.nostr)
               {
                   log("Please provide a valid private key or install a nostr extension");
                    return;
               }
             else {
                 myPrivateKey = null
              }
       }
      const newEvent = {
          kind: 10037, // NostrReAction kind
         created_at: Math.floor(Date.now() / 1000),
        tags: [
                ["original_event_id", sourceEvent.id],
              ["original_author_info", sourceEvent.pubkey, currentRelay.url],
              ["action_type", actionType],
            ],
        content:  replyText || modifyText || '',
     };
      if (actionType === 'validate' || actionType === 'refuse'){
           newEvent.tags.push([actionType,sourceEvent.id])
       }
       if (actionType === 'reply') {
          newEvent.tags.push(["reply_to_event_id",sourceEvent.id])
            if(replyText && replyText.length > 140) {
                const ipfsCid =  await uploadToIPFS(replyText);
                  newEvent.content = `ipfs://${ipfsCid}`
                 newEvent.tags.push(["ipfs_cid", ipfsCid])
           }
      }
     if (actionType === 'modify') {
         newEvent.tags.push(["original_content_hash", sourceEvent.content]);
          if(modifyText && modifyText.length > 140) {
                const ipfsCid =  await uploadToIPFS(modifyText);
                  newEvent.content = `ipfs://${ipfsCid}`
                 newEvent.tags.push(["ipfs_cid", ipfsCid])
           }
      }
    try {
         log(`Sending ${actionType} action`);
       let signedEvent
        if(myPrivateKey)
             signedEvent =  window.nostr.signEvent(newEvent, myPrivateKey)
         else {
              signedEvent = await window.nostr.signEvent(newEvent)
          }
         const published = await  publishEvent(signedEvent)
          if(published)
              log(`Successfully published ${actionType} with id ${signedEvent.id}`);
           sendNotification(sourceEvent, signedEvent);
        }
      catch(e){
           log(`Error in ${actionType} action ${e.message}`);
        }
    }
    async function uploadToIPFS(content) {
        try {
            const response  =  await fetch(`${ipfsAPI}/api/v0/add`, {
                 method: 'POST',
                  body: new TextEncoder().encode(content) ,
             });
           if (!response.ok) {
                  throw new Error(`Failed to upload to IPFS: ${response.status} ${response.statusText}`);
               }
           const jsonResponse = await response.json();
            log(`Upload to IPFS sucessfull with CID : ${jsonResponse.Hash}`);
            return jsonResponse.Hash
        }
       catch (e) {
            log(`Error uploading to IPFS : ${e.message}`)
      }
  }
  async function sendNotification(sourceEvent, repostEvent) {
     const notificationEvent = {
           kind: 10038, // Notification kind
           created_at: Math.floor(Date.now() / 1000),
           tags: [
                ["original_event_id", sourceEvent.id],
                ["original_author_info", sourceEvent.pubkey, currentRelay.url],
                ["repost_event_id", repostEvent.id]
              ],
          content: ""
     };
        try {
           log("Sending notification event")
             let signedEvent
                if(privateKeyInput.value)
                  signedEvent =  window.nostr.signEvent(notificationEvent, privateKeyInput.value)
              else {
                  signedEvent =  await window.nostr.signEvent(notificationEvent)
              }
           const published = await  publishEvent(signedEvent)
           if(published)
                log(`Successfully published notification event with id ${signedEvent.id}`);
         }
       catch(e){
            log(`Error sending notification event with message : ${e.message}`);
        }
    }
    async function publishEvent(signedEvent){
        return new Promise(async (resolve, reject) => {
           if (!currentRelay)
             {
                 reject("Relay is not defined")
                   return
             }
              try{
                let result = await currentRelay.publish(signedEvent)
                  if(result) {
                      log("Event Published", signedEvent.kind);
                       resolve(true);
                   }
                 else {
                       log("Event Published error", signedEvent.kind)
                       reject("Error in publish");
                   }
           }
            catch (error) {
                log(`Error in publish event : ${error.message}`)
               reject("error in publish");
             }
       });
   }
 //publish event
   publishEventBtn.addEventListener('click', async function(){
        const content = contentInput.value
       if (!content) {
              log("Please provide a content")
             return
         }
     let newEvent =  {
         kind: 10037, // Text note
           created_at: Math.floor(Date.now() / 1000),
           tags: [],
           content: content,
     };
        try {
          log(`Publishing Event to relay`);
             let signedEvent
                if(privateKeyInput.value)
                   signedEvent =  window.nostr.signEvent(newEvent, privateKeyInput.value)
              else {
                 signedEvent =  await window.nostr.signEvent(newEvent)
              }
              const published = await publishEvent(signedEvent);
              if (published) {
                   log(`Successfully published event to relay with ID ${signedEvent.id}`);
               }
       }
       catch (e)
          {
             log(`Error in publish event with message : ${e.message}`)
          }
    });
     function displayIPFSContent(ipfsCid) {
           const fullUrl = `${ipfsGateway}/ipfs/${ipfsCid}`
          fetch(fullUrl).then(response =>
           {
              if (!response.ok) {
                  throw new Error(`Failed to fetch from ipfs ${fullUrl} : ${response.status} ${response.statusText}`);
                }
                return response.text()
        }).then(text=>{
             ipfsModalContent.innerHTML = text
              ipfsModal.style.display = 'flex'
         }).catch(e=> log(`Error displaying IPFS content : ${e.message}`))
    }
     function closeModal() {
        ipfsModal.style.display = 'none';
    }
      function loadSettings() {
           const relayUrl = localStorage.getItem('relayUrl');
           if (relayUrl) {
               relayUrlInput.value = relayUrl;
          }
          const pubkeys = localStorage.getItem('pubkeys');
           if (pubkeys) {
               pubkeysInput.value = pubkeys;
          }
     }
   async function saveSettings() {
        localStorage.setItem('relayUrl', relayUrlInput.value);
        localStorage.setItem('pubkeys', pubkeysInput.value);
   }
}
