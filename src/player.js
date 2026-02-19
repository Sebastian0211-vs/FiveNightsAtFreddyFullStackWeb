function playAnimation(imgElement, animation, opacity = 1) {
    imgElement.style.opacity = opacity;
    let index = 0;
    const interval = 1000 / animation.fps;

    setInterval(() => {
        imgElement.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
}