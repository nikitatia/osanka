navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
        var videoElement = document.getElementById('videoElement');
        videoElement.srcObject = stream;

        return Promise.all([posenet.load(), cocoSsd.load()]);
    })
    .then(function ([posenetModel, cocoSsdModel]) {
        var startButton = document.getElementById('startButton');
        var stopButton = document.getElementById('stopButton');
        var intervalId, breakTimerId, breakTimeoutId;

        startButton.addEventListener('click', function () {
            console.log('Контроль осанки запущен');
            startButton.style.display = 'none';
            stopButton.style.display = 'inline-block';

            startBreakTimer();
            intervalId = setInterval(function () {
                detectPosture(posenetModel, cocoSsdModel);
            }, 1000);
        });

        stopButton.addEventListener('click', function () {
            console.log('Контроль осанки остановлен');
            stopButton.style.display = 'none';
            startButton.style.display = 'inline-block';

            clearInterval(intervalId); 
            clearTimeout(breakTimerId); 
            clearTimeout(breakTimeoutId); 
            stopAlertSound(); 
            resetVideoEffects(); 
        });

        function startBreakTimer() {
            breakTimerId = setTimeout(function () {
                showBreakNotification();
            }, 45 * 60 * 1000);
        }

        function showBreakNotification() {
            var breakAudio = new Audio('break.mp3');
            var unbreakAudio = new Audio('unbreak.mp3');
            breakAudio.play();
            alert('Пора сделать перерыв на 7 минут!');

            breakTimeoutId = setTimeout(function () {
                if (confirm('Перерыв окончен! Вернитесь к работе.')) {
                    startBreakTimer();
                    unbreakAudio.play();
                }
            }, 7 * 60 * 1000);
        }
    })
    .catch(function (err) {
        console.log("An error occurred: " + err);
    });

var isPlayingSound = false;
var isPostureNotificationShown = false;

function detectPosture(posenetModel, cocoSsdModel) {
    var videoElement = document.getElementById('videoElement');
    var imageScaleFactor = 0.5;
    var outputStride = 16;
    var flipHorizontal = false;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    cocoSsdModel.detect(canvas).then(predictions => {
        const people = predictions.filter(prediction => prediction.class === 'person');
        if (people.length > 1) {
            console.log('Несколько людей обнаружено');
            playMultipleUsersAlert();
            applyMultipleUsersEffects();
        } 
        else if (people.length < 1) {
            console.log('Нет людей в кадре');
            applyNoUsersEffects();
            stopAlertSound();
        } 
        else {
            posenetModel.estimateSinglePose(canvas, imageScaleFactor, flipHorizontal, outputStride)
                .then(function (pose) {
                    if (checkPosture(pose)) {
                        console.log('Вы сидите ровно');
                        resetVideoEffects();
                        stopAlertSound();
                    } else {
                        console.log('Сядьте ровно!');
                        playAlertSound();
                        applyVideoEffects();
                    }
                })
                .catch(function (err) {
                    console.log("An error occurred: " + err);
                });
        }
    }).catch(function (err) {
        console.log("An error occurred: " + err);
    });
}

function checkPosture(pose) {
    const rightEye = pose.keypoints[2].position;
    const leftEye = pose.keypoints[1].position;
    const rightShoulder = pose.keypoints[6].position;
    const leftShoulder = pose.keypoints[5].position;

    const eyeDistance = Math.abs(rightEye.y - leftEye.y);
    const shoulderDistance = Math.abs(rightShoulder.y - leftShoulder.y);
    const rightEyeShoulderDistance = Math.sqrt(((rightEye.y - rightShoulder.y)**2) + ((rightEye.x - rightShoulder.x)**2))
    const leftEyeShoulderDistance = Math.sqrt(((leftEye.y - leftShoulder.y)**2) + ((rightEye.x - rightShoulder.x)**2))

    const minEyeDistance = 15;
    const minShoulderDistance = 40;
    const minrightEyeShoulderDistance = 250;
    const minleftEyeShoulderDistance = 250;

    return (eyeDistance <= minEyeDistance && shoulderDistance <= minShoulderDistance && rightEyeShoulderDistance >= minrightEyeShoulderDistance && leftEyeShoulderDistance >= minleftEyeShoulderDistance);
}

function applyVideoEffects() {
    var bodyElement = document.body;
    var videoElement = document.getElementById('videoElement');
    bodyElement.classList.add('incorrect-posture');
    bodyElement.classList.remove('correct-posture', 'multiple-users', 'no-users');
    videoElement.classList.add('incorrect-posture-video');
    videoElement.classList.remove('correct-posture-video');
}

function resetVideoEffects() {
    var bodyElement = document.body;
    var videoElement = document.getElementById('videoElement');
    bodyElement.classList.remove('incorrect-posture', 'multiple-users', 'no-users');
    bodyElement.classList.add('correct-posture');
    videoElement.classList.remove('incorrect-posture-video');
    videoElement.classList.add('correct-posture-video');
}

function applyNoUsersEffects() {
    var bodyElement = document.body;
    bodyElement.classList.add('no-users');
    bodyElement.classList.remove('correct-posture', 'incorrect-posture', 'multiple-users');
    videoElement.classList.remove('incorrect-posture-video');
}

function applyMultipleUsersEffects() {
    var bodyElement = document.body;
    bodyElement.classList.add('multiple-users');
    bodyElement.classList.remove('correct-posture', 'incorrect-posture', 'no-users');
    videoElement.classList.remove('incorrect-posture-video');
}

function playAlertSound() {
    if (!isPlayingSound) {
        var audio = new Audio('cc182e30aaa0ad1ab614548f7ab3be6b.mp3');
        audio.loop = true;
        audio.play();
        isPlayingSound = true;

        window.alertAudio = audio;
    }
}

function playMultipleUsersAlert() {
    if (!isPlayingSound) {
        var audio = new Audio('soundd.mp3');
        audio.loop = true;
        audio.play();
        isPlayingSound = true;

        window.alertAudio = audio;
    }
}

function stopAlertSound() {
    if (isPlayingSound) {
        window.alertAudio.pause();
        window.alertAudio.currentTime = 0;
        isPlayingSound = false;
    }
}
