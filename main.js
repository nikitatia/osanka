navigator.mediaDevices.getUserMedia({ video: true })
    .then(function (stream) {
        var videoElement = document.getElementById('videoElement');
        videoElement.srcObject = stream;

        // загрузка модели
        return posenet.load();
    })
    .then(function (net) {
        var startButton = document.getElementById('startButton');
        var stopButton = document.getElementById('stopButton');
        var intervalId, breakTimerId, breakTimeoutId;

        startButton.addEventListener('click', function () {
            console.log('Контроль осанки запущен');
            startButton.style.display = 'none';
            stopButton.style.display = 'inline-block';

            // частота проверки осанки
            startBreakTimer();
            intervalId = setInterval(function () {
                detectPosture(net);
            }, 1000);
        });

        // контроль остановлен
        stopButton.addEventListener('click', function () {
            console.log('Контроль осанки остановлен');
            stopButton.style.display = 'none';
            startButton.style.display = 'inline-block';

            clearInterval(intervalId); // сброс интервала проверки осанки
            clearTimeout(breakTimerId); // сброс интервала напоминаний
            clearTimeout(breakTimeoutId); // сброс перерыва
            stopAlertSound(); // остановка звука в случае неправильной осанки
            removeBlur(); // удаление блюра если сидит неправильно
        });

        // начало работы интервала
        function startBreakTimer() {
            breakTimerId = setTimeout(function () {
                showBreakNotification();
            }, 45 * 60 * 1000);
        }

        // показать уведомление о перерыве
        function showBreakNotification() {
            var breakAudio = new Audio('break.mp3');
            var unbreakAudio = new Audio('unbreak.mp3');
            breakAudio.play();
            alert('Пора сделать перерыв на 7 минут!');

            // конец перерыва
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

// обнаружение положения 
function detectPosture(net) {
    var videoElement = document.getElementById('videoElement');
    var imageScaleFactor = 0.5;
    var outputStride = 16;
    var flipHorizontal = false;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    net.estimateSinglePose(canvas, imageScaleFactor, flipHorizontal, outputStride)
        .then(function (pose) {
            if (checkPosture(pose)) {
                console.log('Вы сидите ровно');
                removeBlur();
                stopAlertSound();
            } else {
                console.log('Сядьте ровно!');
                playAlertSound();
                applyBlur();
            }
        })
        .catch(function (err) {
            console.log("An error occurred: " + err);
        });
}

// функция для вычисления правильной осанки
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

// создание элемента для блюра всего экрана
var blurOverlay = document.createElement('div');
blurOverlay.style.position = 'fixed';
blurOverlay.style.top = '0';
blurOverlay.style.left = '0';
blurOverlay.style.width = '100%';
blurOverlay.style.height = '100%';
blurOverlay.style.backdropFilter = 'blur(5px)';
blurOverlay.style.zIndex = '1000';
blurOverlay.style.display = 'none';
document.body.appendChild(blurOverlay);

function applyBlur() {
    blurOverlay.style.display = 'block';
}

function removeBlur() {
    blurOverlay.style.display = 'none';
}

function playAlertSound() {
    if (!isPlayingSound) {
        var audio = new Audio('sound.mp3');
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
