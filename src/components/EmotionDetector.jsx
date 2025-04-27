import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './EmotionDetector.css';

function EmotionDetector() {
    const videoRef = useRef();
    const canvasRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState(null);
    const detectionInterval = useRef(null);

    useEffect(() => {
        loadModels();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const loadModels = async () => {
        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
            startVideo();
        } catch (error) {
            setError('Error loading models: ' + error.message);
            console.error(error);
        }
    };

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => {
                setError('Error accessing camera: ' + err.message);
                console.error(err);
            });
    };

    const handleVideoPlay = () => {
        if (detectionInterval.current) clearInterval(detectionInterval.current);

        detectionInterval.current = setInterval(async () => {
            if (videoRef.current && canvasRef.current && modelsLoaded) {
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const detections = await faceapi
                    .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
                    .withFaceExpressions();

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                detections.forEach(detection => {
                    const box = detection.detection.box;
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    const emotions = detection.expressions;
                    const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
                        emotions[a] > emotions[b] ? a : b
                    );

                    ctx.font = '24px Arial';
                    ctx.fillStyle = '#00ff00';
                    ctx.fillText(
                        `${dominantEmotion} (${Math.round(emotions[dominantEmotion] * 100)}%)`,
                        box.x,
                        box.y - 10
                    );
                });
            }
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (detectionInterval.current) {
                clearInterval(detectionInterval.current);
            }
        };
    }, []);

    return (
        <div className="emotion-detector-container">
            {error && <div className="error-message">{error}</div>}

            <div className="video-wrapper">
                <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} />
                <canvas ref={canvasRef} />
            </div>

            <div className="status-indicator">
                <span className={`status-dot ${modelsLoaded ? 'active' : ''}`}></span>
                {modelsLoaded ? 'Model Active' : 'Loading Model...'}
            </div>
        </div>
    );
}

export default EmotionDetector;
