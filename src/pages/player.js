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

function playFreddyMenu(imgElement, animation) {
    const interval = 100

    setInterval(() => {
        const roll = Math.floor(Math.random() * 100);
        let src;
        if      (roll === 97) src = '../../assets/menu/2.png';
        else if (roll === 98) src = '../../assets/menu/3.png';
        else if (roll === 99) src = '../../assets/menu/4.png';
        else                  src = '../../assets/menu/1.png';

        imgElement.src = src;
    }, interval);
}