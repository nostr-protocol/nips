// Constants
let relays = {};
let currentRelay;

// Variables
let pubkey;
let privateKey;

    // Get DOM Elements
    const privateKeyInput = document.getElementById('privateKeyInput');
    const connectBtn = document.getElementById('connectBtn');
    const eventsDiv = document.getElementById('events');
  const addRelayBtn = document.getElementById('addRelayBtn');
    const relayUrlInput = document.getElementById('relayUrlInput');
    const relaySelect = document.getElementById('relaySelect');
    const ipfsGatewayInput = document.getElementById('ipfsGatewayInput');

    // State Variables
     let currentEvents = [];

    // Connect button event handler
    connectBtn.addEventListener('click', async function() {
        try {
             // Retrieve private key from input and generate pubkey
             privateKey = privateKeyInput.value;
              if (privateKey){
                   pubkey = nostr.getPublicKey(privateKey);
                  } else if(window.nostr){
                       pubkey = await window.nostr.getPublicKey()
                      }

           // Load current relays from storage
              loadRelaysFromStorage();
          // Connect to a relay
              await connectToRelay();
            // Subscribe to the event
              await subscribeToEvents();
             }
        catch (error) {
          console.error("Error connecting to relay:", error);
        }
    });
 // Add relay
  addRelayBtn.addEventListener('click', function(){
     const newRelayUrl  = relayUrlInput.value;
      if (!newRelayUrl)
        {
            console.error("Please provide a valid relay url");
            return
         }
         addRelay(newRelayUrl)
          renderRelayList()
        })

    async function connectToRelay() {
          const selectedRelayUrl = relaySelect.value
             if(!selectedRelayUrl){
                 console.error("Please select a relay");
                 return;
              }
         if (currentRelay){
             currentRelay.close();
           }
            currentRelay = new nostr.Relay(selectedRelayUrl);
          currentRelay.on('connect', () => {
              console.log(`connected to relay ${selectedRelayUrl}`)
         });
         currentRelay.on('error', (e)=> console.error("relay error",e));
        await currentRelay.connect();
     }
    // save the relay url to the local storage
  function saveRelaysToStorage() {
          localStorage.setItem('relays', JSON.stringify(relays));
    }

    // load the relay url from the local storage
   function loadRelaysFromStorage() {
           const storedRelays = localStorage.getItem('relays')
           if(storedRelays) {
                relays =  JSON.parse(storedRelays)
              }
          renderRelayList()
    }

    // Adding a new relay to list of relays
    function addRelay(newRelayUrl) {
           relays[newRelayUrl] = true
          saveRelaysToStorage()
    }
 // render the list of the relays
 function renderRelayList() {
        relaySelect.innerHTML = '<option value="" disabled selected>Select relay to connect</option>';
        for (const url in relays) {
           const option = document.createElement('option')
           option.value = url;
           option.textContent = url;
           relaySelect.appendChild(option);
          }
  }

async function subscribeToEvents() {
       if (!relay)
           {
              console.error("Relay is not connected")
               return;
          }

      // Subscribe to all events to a limited number of events
     const sub =  relay.subscribe([{
           kinds: [1, 10037, 10038],
            limit: 100
       }]);
     sub.on('event', (evt)=>{
          handleEvent(evt);
     });

    console.log("Listening for events...")
}
async function handleEvent(evt) {
        console.log('Event received', evt);
        const existingEventIndex = currentEvents.findIndex(e => e.id === evt.id);
      if (existingEventIndex !== -1)
           {
              console.log("Event already exist");
              currentEvents[existingEventIndex] = evt;
              }
      else
         currentEvents.push(evt);

       currentEvents.sort((a, b) => b.created_at - a.created_at)
       eventsDiv.innerHTML = '';
        for(const event of currentEvents) {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event bg-white p-4 rounded shadow';

            // Check if the content is stored in IPFS and add a button to display it
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
                  eventDiv.appendChild(createActionButtons(event))
              }
            eventsDiv.appendChild(eventDiv);
        }
    }

    function displayIPFSContent(ipfsCid) {
        const modal = document.getElementById('contentModal');
        const modalContent = document.getElementById('modalContent');
        const fullUrl = `${ipfsGatewayInput.value}/ipfs/${ipfsCid}`

          fetch(fullUrl).then(response =>
            {
                if (!response.ok) {
                  throw new Error(`Failed to fetch from ipfs ${fullUrl} : ${response.status} ${response.statusText}`);
                    }

                 return response.text()
               }).then(text=>{
                  modalContent.innerHTML = text
                   modal.style.display = 'flex'
              }).catch(e=> console.error("Error displaying IPFS content",e))
    }

      // function to close modal
   function closeModal() {
         const modal = document.getElementById('contentModal');
            modal.style.display = 'none';
      }

function createActionButtons(sourceEvent) {
   const actionDiv = document.createElement('div');
    actionDiv.className = 'action mt-4 flex space-x-2';
    const likeBtn = document.createElement('button');
      likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Like';
        likeBtn.className =" bg-blue-500 text-white px-4 py-2 rounded"
        likeBtn.addEventListener('click', () => sendNostrReAction('like', sourceEvent));
    actionDiv.appendChild(likeBtn);
   const shareBtn = document.createElement('button');
        shareBtn.innerHTML =  '<i class="fa-solid fa-share"></i> Share'
         shareBtn.className ="bg-green-500 text-white px-4 py-2 rounded"
       shareBtn.addEventListener('click', () => sendNostrReAction('share', sourceEvent));
      actionDiv.appendChild(shareBtn);
   const replyBtn = document.createElement('button');
        replyBtn.innerHTML =  '<i class="fa-solid fa-reply"></i> Reply'
        replyBtn.className ="bg-gray-500 text-white px-4 py-2 rounded"
         replyBtn.addEventListener('click', () => openReplyModal(sourceEvent));
       actionDiv.appendChild(replyBtn);
      return actionDiv;
}
// Modal to add reply
   function openReplyModal(sourceEvent) {
        const modal = document.createElement('div')
        modal.className = 'modal';
      modal.innerHTML = `<div  class="modal-content">
                <h2 class="text-xl font-semibold mb-4">Reply to Event</h2>
                <textarea id="replyText" style="width:100%; height: 100px; border: 1px solid #ddd; margin-bottom: 10px; padding: 8px;"></textarea>
                <button id="sendReplyBtn" class="bg-blue-500 text-white px-4 py-2 rounded mt-2">Send Reply</button>
                <button id="closeReplyBtn"  class="bg-gray-400 text-white px-4 py-2 rounded mt-2">Close</button>
            </div>
        `
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

  async function sendNostrReAction(actionType, sourceEvent, replyText = null) {
       let myPrivateKey = privateKey
           if(!privateKey){
              if(!window.nostr){
                console.error("Please provide a valid private key or install a nostr extension");
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
          newEvent.tags.push(  ["reply_to_event_id",sourceEvent.id])
              if(replyText && replyText.length > 140) {
                  const ipfsCid =  await uploadToIPFS(replyText);
                  newEvent.content = `ipfs://${ipfsCid}`
                  newEvent.tags.push(["ipfs_cid", ipfsCid])
               }
          }
          try {
                let signedEvent
                if (myPrivateKey){
                  signedEvent =  nostr.signEvent(newEvent, myPrivateKey)
                  }
                else {
                     signedEvent =  await window.nostr.signEvent(newEvent)
                }

              const published = await  publishEvent(signedEvent)
              if(published)
                  console.log(`Successfully published ${actionType}`,signedEvent);
              sendNotification(sourceEvent, signedEvent);
           }
        catch(e){
           console.error(`Error in ${actionType}`, e);
        }
    }

async function uploadToIPFS(content) {
    try {
    const ipfsgateway = "https://ipfs.g1sms.fr";
      const response  =  await fetch(`${ipfsgateway}/api/v0/add`, {
        method: 'POST',
         body: new TextEncoder().encode(content) ,
      });

    if (!response.ok) {
         throw new Error(`Failed to upload to IPFS: ${response.status} ${response.statusText}`);
        }
      const jsonResponse = await response.json();
      console.log("Upload to IPFS", jsonResponse);
      return jsonResponse.Hash
    }
    catch (e) {
       console.error("Error uploading to IPFS", e)
    }
}

async function sendNotification(sourceEvent, repostEvent) {
const notificationEvent = {
       kind: 10038, // Notification kind
        created_at: Math.floor(Date.now() / 1000),
    tags: [
        ["original_event_id", sourceEvent.id],
         ["original_author_info", sourceEvent.pubkey, relayUrls[0]],
         ["repost_event_id", repostEvent.id]

    ],
      content: ""
};
  try {
      const signedEvent =  nostr.signEvent(notificationEvent, privateKey)
      const published = await  publishEvent(signedEvent)
      if(published)
          console.log(`Successfully published notification for`, repostEvent)
     }
  catch(e){
       console.error("Error sending notification event", e);
   }
}

async function publishEvent(signedEvent){
return new Promise(async (resolve, reject) => {
      if (!relay)
        {
            reject("Relay is not defined")
             return
         }
          try{
             let result = await relay.publish(signedEvent)
               if(result) {
                console.log("Event Published", signedEvent.kind);
                resolve(true);
               }
               else {
                   console.log("Event Published error", signedEvent.kind)
                 reject("Error in publish");
                }
            }
          catch (error) {
                console.error("Error in publish",error);
             reject("error in publish");
          }
    });
 }
