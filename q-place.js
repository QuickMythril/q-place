document.addEventListener('DOMContentLoaded', fetchPixels);

const gridSize = 100;
let pixels = [
    "4747ffffff", "4847e6db00", "4947a16a3f", "5047e79700", "514792e233",
    "474800c000", "4848ffffff", "4948ffffff", "5048ffffff", "5148888789",
    "474901e5f2", "4849ffffff", "4949000000", "5049ffffff", "5149e4e4e4",
    "47500082ca", "4850ffffff", "4950ffffff", "5050ffffff", "5150ffa6d1",
    "47510600ee", "4851e23eff", "4951820281", "5051ffffff", "5151e80000"
];
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
                pixels.push(pixelData);
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
            cell.setAttribute('id', `${x}-${y}`);
            cell.style.backgroundColor = "DodgerBlue";
            cell.addEventListener('click', handlePixelClick);
            newRow.appendChild(cell);
        }
        newTable.appendChild(newRow);
    }
    document.getElementById('pixel-art').appendChild(newTable);
}

function colorPixels() {
    for (const pixel of pixels) {
        const pixelX = parseInt(pixel.slice(0, 2), 10); // Extract two characters
        const pixelY = parseInt(pixel.slice(2, 4), 10); // Extract two characters
        const pixelRGB = pixel.slice(4, 10); // Extract six characters
        let pixelCell = document.getElementById(`${pixelX}-${pixelY}`);
        if (pixelCell) {
            pixelCell.style.backgroundColor = `#${pixelRGB}`;
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
    if (!userName || userName === 'Name unavailable') {
        await accountLogin();
        if (!userName || userName === 'Name unavailable') {
            console.error('Username is still unavailable');
            return;
        }
    }
    const cell = event.target;
    const [x, y] = cell.id.split('-');
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.addEventListener('change', async (event) => {
        const color = event.target.value;
        const rgbColor = color.substring(1);
        const pixelData = `${x.padStart(2, '0')}${y.padStart(2, '0')}${rgbColor}`;
        cell.style.backgroundColor = color;
        colorPicker.remove();
        await publishPixel(pixelData);
    });
    cell.appendChild(colorPicker);
    colorPicker.click();
}

async function publishPixel(pixelData) {
    try {
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