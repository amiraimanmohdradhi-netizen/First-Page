// components/ARScene.tsx

"use client"; // This is crucial! It tells Next.js to render this component on the client-side.

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Since ar.js is not a standard npm module, you might need to use a script tag in your HTML
// or configure your bundler. For this example, we'll assume it's loaded globally.
// In a real Next.js app, you'd add this to your layout.tsx or a custom _document.tsx file:
// <script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"></script>

// Type definitions for AR.js
interface ARjsSource {
  onResizeElement(): void;
  copyElementSizeTo(element: HTMLElement): void;
  init(callback: () => void): void;
  ready: boolean;
  domElement: HTMLElement;
}

interface ARjsContext {
  arController: { canvas: HTMLElement } | null;
  init(callback: () => void): void;
  update(element: HTMLElement): void;
  getProjectionMatrix(): THREE.Matrix4;
}

interface ARjsMarkerControls {
  new (context: ARjsContext, group: THREE.Group, options: { type: string; patternUrl: string }): void;
}

interface THREEx {
  ArToolkitSource: new (params: { sourceType: string; sourceWidth: number; sourceHeight: number }) => ARjsSource;
  ArToolkitContext: new (params: { cameraParametersUrl: string; detectionMode: string }) => ARjsContext;
  ArMarkerControls: ARjsMarkerControls;
}

declare const THREEx: THREEx;

const ARScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !canvasRef.current) return;

    // Prevent re-initialization on hot reloads
    if (canvasRef.current.getAttribute('data-initialized')) {
      return;
    }

    // --- State variables for cleanup ---
    let isMounted = true;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let arToolkitSource: any;
    let arToolkitContext: any;
    let animationFrameId: number;

    const initAR = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).THREE = THREE;

      // Helper to load scripts sequentially
      const loadScript = (src: string) =>
        new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          script.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
          document.head.appendChild(script);
        });

      try {
        // Load AR.js scripts. Using a specific version is better than `master`.
        await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar.js');
        await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar-threex.js');
      } catch (error) {
        console.error(error);
        return;
      }

      if (!isMounted || !canvasRef.current) return;

      // Now ARjs is available on the window object
      const THREEx = (window as any).THREEx;
      if (!THREEx?.ArToolkitContext || !THREEx?.ArToolkitSource || !THREEx?.ArMarkerControls) {
        console.error('AR.js components on THREEx failed to load.');
        return;
      }

      // Mark as initialized
      canvasRef.current.setAttribute('data-initialized', 'true');

      // ======== Basic Three.js Scene Setup ========
      scene = new THREE.Scene();
      camera = new THREE.Camera();
      scene.add(camera);

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);

      // ======== AR.js Context Setup ========
      arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
        sourceWidth: window.innerWidth,
        sourceHeight: window.innerHeight,
      });

      arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: '/data/camera_para.dat',
        detectionMode: 'mono',
      });

      const onResize = () => {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(renderer.domElement);
        if (arToolkitContext?.arController !== null) {
          arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
        }
      };

      arToolkitSource.init(() => setTimeout(onResize, 500));
      window.addEventListener('resize', onResize);

      arToolkitContext.init(() => {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      });

      const markerRoot = new THREE.Group();
      scene.add(markerRoot);

      new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
        type: 'pattern',
        patternUrl: '/data/patt.hiro',
      });

      const loader = new GLTFLoader();
      loader.load('/my-model.glb', (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.1, 0.1, 0.1);
        model.position.y = 0.5;
        markerRoot.add(model);
      }, undefined, (error) => console.error('An error happened:', error));

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      const animate = () => {
        if (!isMounted || !arToolkitSource.ready) return;
        animationFrameId = requestAnimationFrame(animate);
        arToolkitContext.update(arToolkitSource.domElement);
        scene.visible = camera.visible;
        renderer.render(scene, camera);
      };
      animate();
    };
    
    initAR();

    return () => {
      isMounted = false;

      // Stop the animation frame
      cancelAnimationFrame(animationFrameId);

      // Stop the webcam
      const video = arToolkitSource?.domElement;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((track: any) => track.stop());
      }

      renderer?.dispose();
      canvasRef.current?.removeAttribute('data-initialized');
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};

export default ARScene;