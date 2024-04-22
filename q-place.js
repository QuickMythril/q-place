document.addEventListener('DOMContentLoaded', fetchPixels);

const gridSize = 100;
let pixels = {
    "47-47": { color: "#ffffff", user: "", time: null },
    "48-47": { color: "#e6db00", user: "", time: null },
    "49-47": { color: "#a16a3f", user: "", time: null },
    "50-47": { color: "#e79700", user: "", time: null },
    "51-47": { color: "#92e233", user: "", time: null },
    "47-48": { color: "#00c000", user: "", time: null },
    "48-48": { color: "#ffffff", user: "", time: null },
    "49-48": { color: "#ffffff", user: "", time: null },
    "50-48": { color: "#ffffff", user: "", time: null },
    "51-48": { color: "#888789", user: "", time: null },
    "47-49": { color: "#01e5f2", user: "", time: null },
    "48-49": { color: "#ffffff", user: "", time: null },
    "49-49": { color: "#000000", user: "", time: null },
    "50-49": { color: "#ffffff", user: "", time: null },
    "51-49": { color: "#e4e4e4", user: "", time: null },
    "47-50": { color: "#0082ca", user: "", time: null },
    "48-50": { color: "#ffffff", user: "", time: null },
    "49-50": { color: "#ffffff", user: "", time: null },
    "50-50": { color: "#ffffff", user: "", time: null },
    "51-50": { color: "#ffa6d1", user: "", time: null },
    "47-51": { color: "#0600ee", user: "", time: null },
    "48-51": { color: "#e23eff", user: "", time: null },
    "49-51": { color: "#820281", user: "", time: null },
    "50-51": { color: "#ffffff", user: "", time: null },
    "51-51": { color: "#e80000", user: "", time: null }
};
let selectedPixelData = null;
let userPublicKey = '';
let userAddress = '';
let userName = '';

async function fetchPixels() {
    try {
        const response = await fetch(`/arbitrary/resources/search?identifier=qplace-pixel-&mode=ALL&service=CHAIN_DATA`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const results = await response.json();
        if (results.length > 0) {
            results.sort((a, b) => (a.updated || a.created) - (b.updated || b.created));
            results.forEach(result => {
                const pixelData = result.identifier.slice(13, 23);
                const [x, y] = [pixelData.slice(0, 2), pixelData.slice(2, 4)];
                const color = `#${pixelData.slice(4, 10)}`;
                pixels[`${x}-${y}`] = {
                    color,
                    user: result.name,
                    time: result.created
                };
            });
        }
    } catch (error) {
        console.error('Error fetching pixels', error);
    }
    createGrid();
    colorPixels();
}

function createGrid() {
    let newTable = document.createElement('table');
    for (let y = 0; y < gridSize; y++) {
        let newRow = document.createElement('tr');
        for (let x = 0; x < gridSize; x++) {
            let cell = document.createElement('td');
            cell.setAttribute('id', `${x.toString().padStart(2, '0')}-${y.toString().padStart(2, '0')}`);
            cell.style.backgroundColor = "#1e90ff"; // DodgerBlue
            cell.addEventListener('click', handlePixelClick);
            newRow.appendChild(cell);
        }
        newTable.appendChild(newRow);
    }
    document.getElementById('pixel-art').appendChild(newTable);
}

function colorPixels() {
    for (const [coords, pixelData] of Object.entries(pixels)) {
        const pixelCell = document.getElementById(coords);
        if (pixelCell) {
            pixelCell.style.backgroundColor = pixelData.color;
        }
    }
}

async function accountLogin() {
    try {
        const account = await qortalRequest({
            action: "GET_USER_ACCOUNT"
        });
        userAddress = account.address ? account.address : 'Address unavailable';
        userPublicKey = account.publicKey ? account.publicKey : 'Public key unavailable';
        let names = [];
        if (userAddress !== 'Address unavailable') {
            names = await qortalRequest({
                action: "GET_ACCOUNT_NAMES",
                address: userAddress
            });
        }
        userName = names.length > 0 && names[0].name ? names[0].name : 'Name unavailable';
    } catch (error) {
        console.error('Error fetching account details:', error);
    }
}

async function handlePixelClick(event) {
    const cell = event.target;
    const coords = cell.id;
    const [x, y] = coords.split('-').map(coord => coord.padStart(2, '0'));
    updateTopBar(x, y, pixels[coords]?.color || '#1e90ff', pixels[coords]?.user, pixels[coords]?.time);
    const colorPicker = document.getElementById('color-picker');
    selectedPixelData = `${x}-${y}`;
    const publishButton = document.getElementById('publish-button');
    publishButton.removeEventListener('click', publishSelectedPixel);
    publishButton.addEventListener('click', publishSelectedPixel);
}

function updateTopBar(x, y, color, user, time) {
    document.getElementById('coordinates').textContent = `${x}, ${y}`;
    document.getElementById('current-color').textContent = `${color}`;
    document.getElementById('color-picker').value = color;
    document.getElementById('last-user').innerHTML = user ? `<img src="/arbitrary/THUMBNAIL/${user}/qortal_avatar" onerror="this.style='display:none'"> ${user}` : 'N/A';
    document.getElementById('timestamp').textContent = time ? `${formatTimeAgo(time)}` : 'N/A';
}

async function publishSelectedPixel() {
    if (selectedPixelData) {
        const colorPicker = document.getElementById('color-picker');
        const color = colorPicker.value;
        const rgbColor = color.substring(1);
        const [x, y] = selectedPixelData.split('-').map(coord => coord.padStart(2, '0'));
        const pixelData = x + y + rgbColor;
        await publishPixel(pixelData);
        const cell = document.getElementById(`${selectedPixelData}`);
        cell.style.backgroundColor = color;
    }
}

async function publishPixel(pixelData) {
    try {
        if (!userName || userName === 'Name unavailable' || userName === '') {
            await accountLogin();
            if (!userName || userName === 'Name unavailable' || userName === '') {
                console.error('Username is still unavailable');
                return;
            }
        }
        const pixelIdentifier = 'qplace-pixel-' + pixelData;
        const emptyFile = new Blob([], { type: 'application/octet-stream' });
        const response = await qortalRequest({
            action: "PUBLISH_QDN_RESOURCE",
            name: userName,
            service: "CHAIN_DATA",
            identifier: pixelIdentifier,
            file: emptyFile
        });
        console.log('Pixel published successfully');
    } catch (error) {
        console.error('Error publishing pixel:', error);
    }
}

function formatTimeAgo(timestamp) {
    const currentTimestamp = Date.now();
    timeAgo = currentTimestamp - timestamp;
    if (timeAgo < 0) {
        return "pending";
    }
    const seconds = Math.floor((timeAgo / 1000) % 60);
    const minutes = Math.floor((timeAgo / (1000 * 60)) % 60);
    const hours = Math.floor((timeAgo / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeAgo / (1000 * 60 * 60 * 24) % 30.4375);
    const months = Math.floor(timeAgo / (1000 * 60 * 60 * 24 * 30.4375) % 12);
    const years = Math.floor(timeAgo / (1000 * 60 * 60 * 24 * 30.4375 * 12));
    let readableFormat = '';
    if (years > 0) {
        readableFormat += `${years} yr${years>1?'s':''}${months>0?', ':''}`;
    }
    if (months > 0) {
        readableFormat += `${months} month${months>1?'s':''}${years<1&&days>0?', ':''}`;
    }
    if ((days > 0) && (years < 1)) {
        readableFormat += `${days} day${days>1?'s':''}${months<1&&hours>0?', ':''}`;
    }
    if ((hours > 0) && (months+years < 1)) {
        readableFormat += `${hours} hr${hours>1?'s':''}${days<1&&minutes>0?', ':''}`;
    }
    if ((minutes > 0) && (days+months+years < 1)) {
        readableFormat += `${minutes} min${minutes>1?'s':''}${hours<1&&seconds>0?', ':''}`;
    }
    if ((seconds > 0) && (hours+days+months+years < 1)) {
        readableFormat += `${seconds} sec${seconds>1?'s':''} `;
    }
    return `${readableFormat} ago`;
}