let trainingData = {};

importScripts('crypto.js');

chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed');

    const key = await getKey();
    if (!key) {
        // Generate and store the key if it doesn't exist
        const newKey = await generateKey();
        await storeKey(newKey);
        console.log('Encryption key generated and stored.');
    } else {
        console.log('Encryption key already exists.');
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, {action: "togglePopup"});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in background:', request);

    if (request.action === 'trainModel') {
        (async () => {
            try {
                const result = await retrieveDecryptedData('trainingData');
                let trainingData = result?.trainingData || {};
                let markovChains = result?.markovChains || {};

                const { fieldName, fieldValue } = request;
                if (!trainingData[fieldName]) {
                    trainingData[fieldName] = [];
                }
                trainingData[fieldName].push(fieldValue);
                trainingData[fieldName] = trainingData[fieldName].slice(-20);

                if (!markovChains[fieldName]) {
                    markovChains[fieldName] = {};
                }
                const data = trainingData[fieldName];
                for (let i = 0; i < data.length - 1; i++) {
                    const current = data[i];
                    const next = data[i + 1];
                    if (!markovChains[fieldName][current]) {
                        markovChains[fieldName][current] = {};
                    }
                    if (!markovChains[fieldName][current][next]) {
                        markovChains[fieldName][current][next] = 0;
                    }
                    markovChains[fieldName][current][next]++;
                }

                await storeEncryptedData('trainingData', { trainingData, markovChains });
                sendResponse({ status: 'Data updated' });
            } catch (error) {
                console.error('Error training model:', error);
                sendResponse({ status: 'Error', message: error.message || 'Unknown error' });
            }
        })();
        return true; // Keeps the message channel open for asynchronous sendResponse
    }

    if (request.action === 'saveProfile') {
        (async () => {
            try {
                const profiles = await retrieveDecryptedData('profiles') || {};
                profiles[request.profile.name] = request.profile;
                await storeEncryptedData('profiles', profiles);
                sendResponse({ status: 'Profile saved' });
            } catch (error) {
                console.error('Error saving profile:', error);
                sendResponse({ status: 'Error', message: error.message || 'Unknown error' });
            }
        })();
        return true; // Keeps the message channel open for asynchronous sendResponse
    }

    if (request.action === 'loadProfiles') {
        (async () => {
            try {
                const profiles = await retrieveDecryptedData('profiles') || {};
                sendResponse({ profiles });
            } catch (error) {
                console.error('Error loading profiles:', error);
                sendResponse({ status: 'Error', message: error.message || 'Unknown error' });
            }
        })();
        return true; // Keeps the message channel open for asynchronous sendResponse
    }
});

