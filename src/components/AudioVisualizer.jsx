import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AudioVisualizer = ({ audioData, isPlaying }) => {
  const containerRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const particlesRef = useRef();
  const starsRef = useRef();
  const frameRef = useRef();
  const zoomSpeedRef = useRef(1);
  const baseDistanceRef = useRef(15);
  const originalPositionsRef = useRef();
  const circlePositionsRef = useRef();

  // Set up Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    // Create starfield background
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    // Create particles
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const circlePositions = new Float32Array(particleCount * 3);

    // Create spiral galaxy distribution
    const arms = 3;
    const armWidth = 0.5;
    const spiralTightness = 0.3;
    const verticalThickness = 0.2;

    for (let i = 0; i < particleCount; i++) {
      // Spiral galaxy positions
      const radius = Math.random() * 10;
      const spinAngle = radius * spiralTightness;
      const armOffset = (2 * Math.PI) / arms;
      const arm = Math.floor(Math.random() * arms);
      const angle = spinAngle + arm * armOffset;
      
      const spread = (Math.random() - 0.5) * armWidth * radius;
      const verticalPosition = (Math.random() - 0.5) * verticalThickness * radius;

      positions[i * 3] = originalPositions[i * 3] = (radius * Math.cos(angle)) + (spread * Math.cos(angle + Math.PI/2));
      positions[i * 3 + 1] = originalPositions[i * 3 + 1] = verticalPosition;
      positions[i * 3 + 2] = originalPositions[i * 3 + 2] = (radius * Math.sin(angle)) + (spread * Math.sin(angle + Math.PI/2));

      // Calculate circle positions
      const circleAngle = (i / particleCount) * Math.PI * 2;
      const circleRadius = 8;
      circlePositions[i * 3] = Math.cos(circleAngle) * circleRadius;
      circlePositions[i * 3 + 1] = 0;
      circlePositions[i * 3 + 2] = Math.sin(circleAngle) * circleRadius;

      // Color gradient
      const distanceFromCenter = Math.sqrt(
        positions[i * 3] ** 2 + 
        positions[i * 3 + 1] ** 2 + 
        positions[i * 3 + 2] ** 2
      ) / 10;

      colors[i * 3] = 0.5 + distanceFromCenter * 0.5;     // R
      colors[i * 3 + 1] = 0.2 + distanceFromCenter * 0.3; // G
      colors[i * 3 + 2] = 1 - distanceFromCenter * 0.5;   // B
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    camera.position.z = baseDistanceRef.current;
    camera.position.y = 15;
    camera.lookAt(0, 0, 0);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particlesRef.current = particles;
    originalPositionsRef.current = originalPositions;
    circlePositionsRef.current = circlePositions;

    const handleWheel = (event) => {
      event.preventDefault();
      const zoomFactor = event.deltaY * 0.001;
      zoomSpeedRef.current = Math.max(0.3, Math.min(2, zoomSpeedRef.current - zoomFactor));
    };

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      particleGeometry.dispose();
      particleMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current || !starsRef.current) return;

    const particles = particlesRef.current;
    const stars = starsRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const originalPositions = originalPositionsRef.current;
    const circlePositions = circlePositionsRef.current;

    let time = 0;
    let transitionProgress = 0;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.002;

      const currentDistance = baseDistanceRef.current * zoomSpeedRef.current;
      
      // Camera movement
      camera.position.x = Math.sin(time * 0.2) * currentDistance;
      camera.position.z = Math.cos(time * 0.2) * currentDistance;
      camera.position.y = 10 * zoomSpeedRef.current;
      camera.lookAt(0, 0, 0);

      const positions = particles.geometry.attributes.position.array;

      // Transition between spiral and circle based on isPlaying
      const targetTransition = isPlaying ? 1 : 0;
      transitionProgress += (targetTransition - transitionProgress) * 0.05;

      for (let i = 0; i < positions.length; i += 3) {
        // Interpolate between original and circle positions
        positions[i] = originalPositions[i] * (1 - transitionProgress) + 
                      circlePositions[i] * transitionProgress;
        positions[i + 1] = originalPositions[i + 1] * (1 - transitionProgress) + 
                          circlePositions[i + 1] * transitionProgress;
        positions[i + 2] = originalPositions[i + 2] * (1 - transitionProgress) + 
                          circlePositions[i + 2] * transitionProgress;

        // Apply audio reactivity when playing
        if (isPlaying && audioData) {
          const audioIndex = Math.floor((i / positions.length) * audioData.length);
          const value = audioData[audioIndex] / 255.0;
          
          // Radial expansion based on audio
          const angle = Math.atan2(positions[i + 2], positions[i]);
          const radius = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2);
          const expansion = 1 + value * 0.5;
          
          positions[i] = Math.cos(angle) * radius * expansion;
          positions[i + 1] += (value - 0.5) * 0.5; // Vertical movement
          positions[i + 2] = Math.sin(angle) * radius * expansion;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;

      // Rotation effects
      particles.rotation.y += 0.001;
      stars.rotation.y -= 0.0002;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [audioData, isPlaying]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default AudioVisualizer;