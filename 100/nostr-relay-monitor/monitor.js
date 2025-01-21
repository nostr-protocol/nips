    const relayUrlInput = document.getElementById('relayUrl');
    const connectRelayBtn = document.getElementById('connectRelayBtn');
    const eventsDiv = document.getElementById('events');

    const filterPubkeyInput = document.getElementById('filterPubkey');
    const filterActionTypeInput = document.getElementById('filterActionType');
     const applyFilterBtn = document.getElementById('applyFilterBtn')

       const relayStatus = document.getElementById('relay-status');
      const eventsPerSecondSpan = document.getElementById('events-per-second');
       const totalEventsSpan = document.getElementById('total-events');


    let relay;
    let eventCount = 0;
    let startTime = Date.now();
    let filteredEvents = []
     let allEvents = [];

    connectRelayBtn.addEventListener('click', async function(){
      const relayUrl = relayUrlInput.value;
       if (!relayUrl){
        console.error("Please provide a valid relay Url");
        return
        }
        try {
            await connectToRelay(relayUrl);
            await subscribeToEvents();
       }
       catch(error){
            console.error("Error with relay connection:", error)
       }
   });
 applyFilterBtn.addEventListener('click', ()=>{
       const filterPubkey = filterPubkeyInput.value;
        const filterActionType = filterActionTypeInput.value;
          filterEvents(filterPubkey, filterActionType);
          renderEvents()
  });
    async function connectToRelay(relayUrl) {
       relayStatus.textContent = 'Connecting...'
        relay = new nostr.Relay(relayUrl);
        relay.on('connect', () => {
                 console.log(`Connected to ${relayUrl}`);
                relayStatus.textContent = 'Connected'
        });
        relay.on('error', (e)=> {
          console.error("relay error",e)
           relayStatus.textContent = 'Error'
         });
       await relay.connect();
     }
    async function subscribeToEvents() {
      if (!relay)
           {
               console.error("Relay is not connected")
                return;
          }

        const sub = relay.subscribe([{
            kinds: [10037, 10038]
           }]);
      sub.on('event', handleEvent);
        console.log(`Listening for NostrReAction and Notification events from ${relay.url}`)
       startTime = Date.now();
      eventCount = 0;
        setInterval(updateStats, 1000);
    }
    function updateStats() {
           const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
          const eventsPerSecond = (eventCount / elapsedTime).toFixed(2);

          eventsPerSecondSpan.textContent = eventsPerSecond;
         totalEventsSpan.textContent = eventCount;
    }
   function handleEvent(evt) {
          eventCount++;
        console.log('Event received', evt);
        allEvents.push(evt)

        filterEvents(filterPubkeyInput.value, filterActionTypeInput.value)
        renderEvents()
   }

    function filterEvents(filterPubkey, filterActionType) {
          filteredEvents = allEvents.filter(event => {
                 const pubkeyMatch =  !filterPubkey ||  event.pubkey.includes(filterPubkey);
                const actionTypeMatch = !filterActionType || (
                    event.tags.some(tag => tag[0] === 'action_type' && tag[1] === filterActionType)
                  );
                 return pubkeyMatch && actionTypeMatch
           })
    }
     function renderEvents() {
           eventsDiv.innerHTML = '';
            for(const evt of filteredEvents) {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'event';
               const tagsString = JSON.stringify(evt.tags)
                eventDiv.innerHTML = `
                     <p><strong>Kind:</strong> ${evt.kind}</p>
                      <p><strong>Pubkey:</strong> ${evt.pubkey}</p>
                      <p><strong>Content:</strong> ${evt.content}</p>
                      <p><strong>Tags:</strong> ${tagsString}</p>
               `;
            eventsDiv.prepend(eventDiv);
          }
    }
