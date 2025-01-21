  // Constants
    let currentRelay;
    // Get DOM Elements
     const relayUrlInput = document.getElementById('relayUrlInput');
     const connectRelayBtn = document.getElementById('connectRelayBtn');
    const privateKeyInput1 = document.getElementById('privateKeyInput1');
    const privateKeyInput2 = document.getElementById('privateKeyInput2');
    const eventsDiv1 = document.getElementById('events1');
      const eventsDiv2 = document.getElementById('events2');
    const contentInput = document.getElementById('contentInput');
     const publishEventBtn = document.getElementById('publishEventBtn');
    const userContainers = document.getElementById('user-containers');
    const logsDiv = document.getElementById('logs');

    // State Variables
      let currentEvents1 = [];
      let currentEvents2 = [];
      function log(message) {
         const logsDiv = document.getElementById('logs');
              console.log(message);
             logsDiv.innerHTML += message + '<br>';
       }
  function loadApp()
  {
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
         currentRelay = new nostr.Relay(relayUrl);
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
        const sub =  currentRelay.subscribe([{
          kinds: [1, 10037, 10038],
             limit: 100
         }]);
          sub.on('event', handleEvent);
          log("Listening for events...")
      }
     function handleEvent(evt) {
           log(`Event received kind ${evt.kind}`);
         if (evt.pubkey ===  nostr.getPublicKey(privateKeyInput1.value)){
             handleEventForUser(evt, 1)
            }
          else if(evt.pubkey ===  nostr.getPublicKey(privateKeyInput2.value)){
              handleEventForUser(evt, 2)
            }
        else {
             handleEventForUser(evt)
        }
     }
     function handleEventForUser(evt, userIndex) {
         let currentEvents, eventsDiv
            if(userIndex===1) {
                currentEvents = currentEvents1
               eventsDiv = eventsDiv1
           }
          else if(userIndex===2){
               currentEvents = currentEvents2
              eventsDiv = eventsDiv2
         }
          else {
             return
            }

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
           if (event.kind === 1) {
                     eventDiv.appendChild(createActionButtons(event, userIndex))
                 }
               eventsDiv.prepend(eventDiv);
           }
      }
    // Create button actions
      function createActionButtons(sourceEvent, userIndex) {
        const actionDiv = document.createElement('div');
           actionDiv.className = 'action mt-4 flex space-x-2';
        const likeBtn = document.createElement('button');
          likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Like';
           likeBtn.className =" bg-blue-500 text-white px-4 py-2 rounded"
           likeBtn.addEventListener('click', () => sendNostrReAction('like', sourceEvent, userIndex));
        actionDiv.appendChild(likeBtn);
      const shareBtn = document.createElement('button');
          shareBtn.innerHTML =  '<i class="fa-solid fa-share"></i> Share'
          shareBtn.className ="bg-green-500 text-white px-4 py-2 rounded"
        shareBtn.addEventListener('click', () => sendNostrReAction('share', sourceEvent, userIndex));
      actionDiv.appendChild(shareBtn);
     const replyBtn = document.createElement('button');
         replyBtn.innerHTML =  '<i class="fa-solid fa-reply"></i> Reply'
          replyBtn.className ="bg-gray-500 text-white px-4 py-2 rounded"
          replyBtn.addEventListener('click', () => openReplyModal(sourceEvent, userIndex));
       actionDiv.appendChild(replyBtn);
       return actionDiv;
    }
    // Modal to add reply
      function openReplyModal(sourceEvent, userIndex) {
           const modal = document.createElement('div')
            modal.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
            <div style="background: #fff; padding: 20px; border-radius: 5px; width: 80%; max-width: 600px;">
                 <h2 class="text-xl font-semibold mb-4">Reply to Event</h2>
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
          await sendNostrReAction('reply', sourceEvent, userIndex, replyText);
        })
        closeReplyBtn.addEventListener('click',  () => {
              document.body.removeChild(modal)
       })
     }
    // send nostr action
    async function sendNostrReAction(actionType, sourceEvent, userIndex, replyText = null) {
         let myPrivateKey
          if(userIndex===1){
               myPrivateKey = privateKeyInput1.value;
           }
           else if(userIndex===2){
                 myPrivateKey = privateKeyInput2.value
            }
           if (!myPrivateKey) {
            if(!window.nostr){
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
        content:  replyText || '', // Add reply text
    };
       if (actionType === 'reply') {
           newEvent.tags.push(["reply_to_event_id",sourceEvent.id])
            if(replyText && replyText.length > 140) {
              const ipfsCid =  await uploadToIPFS(replyText);
                newEvent.content = `ipfs://${ipfsCid}`
                newEvent.tags.push(["ipfs_cid", ipfsCid])
            }
     }
     try {
           log(`Sending ${actionType} action`);
           let signedEvent
              if(myPrivateKey)
                 signedEvent =  nostr.signEvent(newEvent, myPrivateKey)
             else {
                   signedEvent = await window.nostr.signEvent(newEvent)
              }
             const published = await  publishEvent(signedEvent)
            if(published)
                log(`Successfully published ${actionType} with id ${signedEvent.id}`);
           sendNotification(sourceEvent, signedEvent);
         }
       catch(e){
             log(`Error in ${actionType} action ${e.message}`)
       }
    }
      async function uploadToIPFS(content) {
        try {
            const gateway = "https://ipfs.io";
             const response  =  await fetch(`${gateway}/api/v0/add`, {
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
           if(privateKeyInput1.value && privateKeyInput2.value)
              signedEvent =  nostr.signEvent(notificationEvent, nostr.getPublicKey(privateKeyInput1.value) === sourceEvent.pubkey ? privateKeyInput1.value : privateKeyInput2.value)
          else
                signedEvent =  await window.nostr.signEvent(notificationEvent)
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
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: content,
        };
       try {
            log(`Publishing Event to relay`);
             let signedEvent
             if(privateKeyInput1.value){
                   signedEvent =  nostr.signEvent(newEvent, privateKeyInput1.value)
               }
            else if (privateKeyInput2.value){
                  signedEvent =  nostr.signEvent(newEvent, privateKeyInput2.value)
             }
            else {
                signedEvent =   await window.nostr.signEvent(newEvent)
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
        const modal = document.getElementById('contentModal');
       const modalContent = document.getElementById('modalContent');
       const fullUrl = `https://ipfs.io/ipfs/${ipfsCid}`
         fetch(fullUrl).then(response =>
          {
             if (!response.ok) {
                   throw new Error(`Failed to fetch from ipfs ${fullUrl} : ${response.status} ${response.statusText}`);
                }
                return response.text()
          }).then(text=>{
               modalContent.innerHTML = text
               modal.style.display = 'flex'
           }).catch(e=> log(`Error displaying IPFS content : ${e.message}`))
     }
     function closeModal() {
         const modal = document.getElementById('contentModal');
         modal.style.display = 'none';
    }
}
