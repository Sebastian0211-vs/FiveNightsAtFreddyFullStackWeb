function playAnimation(imgElement, animation, opacity = 1) {
    imgElement.style.opacity = opacity;
    let index = 0;
    const interval = 1000 / animation.fps;

    setInterval(() => {
        imgElement.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
}

function playNoise(imgElement, animation){
    let index = 0;
    const interval = 1000 / animation.fps;
    let b = Math.floor(Math.random() * 3);

    setInterval(() => {
        b = Math.floor(Math.random() * 3);
    }, 1000);

    setInterval(() => {
        imgElement.style.opacity = ((150 + Math.random() * 50 + b * 15) / 245)*0.7;
        imgElement.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
}

function playFreddyMenu(imgElement, animation){
    let index = 0;
    const interval = 1000 / animation.fps;
    setInterval(() => {
        b = Math.floor(Math.random() * 3);
    }, 1000);

    setInterval(() => {
        imgElement.style.opacity = ((150 + Math.random() * 50 + b * 15) / 245)*0.7;
        imgElement.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
}