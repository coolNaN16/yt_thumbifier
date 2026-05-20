const IMAGES_PATH = "images/";
let useAlternativeImages;
let flipBlacklist;
let blacklistStatus;
const EXTENSION_NAME = chrome.runtime.getManifest().name;

let extensionIsDisabled = false;
let appearChance = 1.00; 
let flipChance = 0.25; 

function applyOverlay(thumbnailElement, overlayImageURL, flip = false) {
    const overlayImage = document.createElement("img");
    overlayImage.id = EXTENSION_NAME;
    overlayImage.src = overlayImageURL;
    overlayImage.style.position = "absolute";
    overlayImage.style.top = overlayImage.style.left = "50%";
    overlayImage.style.width = "100%";
    overlayImage.style.transform = `translate(-50%, -50%) ${flip ? 'scaleX(-1)' : ''}`; 
    overlayImage.style.zIndex = "0"; 
    thumbnailElement.parentElement.insertBefore(overlayImage, thumbnailElement.nextSibling);
};

function FindThumbnails() {
    const imageSelectors = [
        "ytd-thumbnail a > yt-image > img.yt-core-image", 
        'img.style-scope.yt-img-shadow[width="86"]', 
        '.yt-thumbnail-view-model__image img', 
        'img.ytCoreImageHost' 
    ];

    const allImages = [];
    for (const selector of imageSelectors) {
        allImages.push(...Array.from(document.querySelectorAll(selector)));
    }

    const targetAspectRatio = [16 / 9, 4 / 3];
    const errorMargin = 0.02; 

    var listAllThumbnails = allImages.filter(image => {
        if (image.height === 0) {
            return false;
        }

        const aspectRatio = image.width / image.height;
        let isCorrectAspectRatio = (Math.abs(aspectRatio - targetAspectRatio[0]) < errorMargin) || (Math.abs(aspectRatio - targetAspectRatio[1]) < errorMargin);
        return isCorrectAspectRatio;
    });

    const videoWallImages = document.querySelectorAll(".ytp-videowall-still-image"); 
    const cuedThumbnailOverlays = document.querySelectorAll('div.ytp-cued-thumbnail-overlay-image');
    listAllThumbnails.push(...videoWallImages, ...cuedThumbnailOverlays);
        
    return listAllThumbnails.filter(image => {
        const parent = image.parentElement;

        const isVideoPreview = parent.closest("#video-preview") !== null || Array.from(parent.classList).some(cls => cls.includes("ytAnimated"))

        const isChapter = parent.closest("#endpoint") !== null

        const processed = Array.from(parent.children).filter(child => {
            const alreadyHasAThumbnail =
                child.id && 
                child.id.includes(EXTENSION_NAME);

            return (
                alreadyHasAThumbnail ||
                isVideoPreview ||
                isChapter
            )
        });

        return processed.length == 0;
    });
}

function applyOverlayToThumbnails() {
    thumbnailElements = FindThumbnails()

    thumbnailElements.forEach((thumbnailElement) => {
        const loops = Math.random() > 0.001 ? 1 : 20; 

        for (let i = 0; i < loops; i++) {
            let flip = Math.random() < flipChance;
            let baseImagePath = getRandomImageFromDirectory();
            if (flip && flipBlacklist && flipBlacklist.includes(baseImagePath)) {
                if (useAlternativeImages) {
                    let newImagePath = `textFlipped/${baseImagePath}`;
                    if (checkImageExistence(newImagePath)) {
                        baseImagePath = newImagePath;
                        flip = false
                    }
                } else {
                    flip = false;
                }
            }

            const overlayImageURL = Math.random() < appearChance ?
                getImageURL(baseImagePath) :
                ""; 

            applyOverlay(thumbnailElement, overlayImageURL, flip);
        }
    });

}

function getImageURL(index) {
    return chrome.runtime.getURL(`${IMAGES_PATH}${index}.png`);
}

async function checkImageExistence(index) {
    const testedURL = getImageURL(index)

    return fetch(testedURL)
        .then(() => {
            return true
        }).catch(error => {
            return false
        })
}

const size_of_non_repeat = 8
const last_indexes = Array(size_of_non_repeat)

function getRandomImageFromDirectory() {
    let randomIndex = -1

    if (highestImageIndex <= size_of_non_repeat) {
        last_indexes.fill(-1); 
    }

    while (last_indexes.includes(randomIndex) || randomIndex < 0) {
        randomIndex = Math.floor(Math.random() * highestImageIndex) + 1;
    }

    last_indexes.shift()
    last_indexes.push(randomIndex)

    return randomIndex
}

var highestImageIndex;
async function getHighestImageIndex() {
    const INITIAL_INDEX = 4;
    let i = INITIAL_INDEX;

    while (await checkImageExistence(i)) {
        i *= 2;
    }

    let min = i <= INITIAL_INDEX ? 1 : i / 2;
    let max = i;

    while (min <= max) {
        let mid = Math.floor((min + max) / 2);

        if (await checkImageExistence(mid)) {
            min = mid + 1;
        } else {
            max = mid - 1;
        }
    }

    highestImageIndex = max;
}

async function GetFlipBlocklist() {
    try {
        const response = await fetch(chrome.runtime.getURL(`${IMAGES_PATH}flip_blacklist.json`));
        const data = await response.json();
        useAlternativeImages = data.useAlternativeImages;
        flipBlacklist = data.blacklistedImages;
        blacklistStatus = `Flip blacklist found. ${useAlternativeImages ? "Images will be substituted." : "Images won't be flipped."}`;
    } catch (error) {
        blacklistStatus = "No flip blacklist found. Proceeding without it";
    }
}

async function LoadConfig() {
    const df = {
        extensionIsDisabled: extensionIsDisabled,
        appearChance: appearChance,
        flipChance: flipChance
    }

    try {
        const config = await new Promise((resolve, reject) => {
            chrome.storage.local.get({
                extensionIsDisabled,
                appearChance,
                flipChance
            }, (result) => {
                chrome.runtime.lastError ? 
                    reject(chrome.runtime.lastError) : 
                    resolve(result) 
                });
        });

        extensionIsDisabled = config.extensionIsDisabled || df.extensionIsDisabled;
        appearChance = config.appearChance || df.appearChance;
        flipChance = config.flipChance || df.flipChance;

        if (Object.keys(config).length === 0 && config.constructor === Object) {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set(df, () => {
                    chrome.runtime.lastError ? 
                        reject(chrome.runtime.lastError) : 
                        resolve() 
                })
            })
        }
    } catch (error) {
        console.error("Guhh?? Error loading configuration:", error);
    }
}

async function Main() {
    await LoadConfig()

    if (extensionIsDisabled) {
        console.info(`${EXTENSION_NAME} is disabled.`)
        return 
    }

    await GetFlipBlocklist()
    console.info(`${EXTENSION_NAME} will now detect the amount of images. Ignore all the following errors.`)
    await getHighestImageIndex()
        .then(() => {
            setInterval(applyOverlayToThumbnails, 100);
            console.info(
                `${EXTENSION_NAME} Loaded Successfully. ${highestImageIndex} images detected. ${blacklistStatus}.`
            );
        })
}

Main()