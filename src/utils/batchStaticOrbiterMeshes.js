import { Matrix4, Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Only fixed, opaque orbiter parts belong in a batch. Animated gimbals remain
// separate roots so their original transforms and lighting are preserved.
export function batchStaticOrbiterMeshes(root, animatedRoots = []) {
  const excluded = new Set(animatedRoots);
  const groups = new Map();
  const collect = (node, parentMatrix) => {
    if (excluded.has(node) || !node.visible) return;
    node.updateMatrix();
    const matrix = parentMatrix.clone().multiply(node.matrix);
    if (node.isMesh && !Array.isArray(node.material) && !node.material.transparent) {
      const properties = node.material.toJSON();
      delete properties.uuid;
      const key = JSON.stringify([properties, node.castShadow, node.receiveShadow, node.renderOrder, node.layers.mask]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ node, matrix });
    }
    node.children.forEach((child) => collect(child, matrix));
  };
  root.children.forEach((child) => collect(child, new Matrix4()));

  const batches = [];
  for (const parts of groups.values()) {
    if (parts.length < 2) continue;
    const geometries = parts.map(({ node, matrix }) => node.geometry.clone().applyMatrix4(matrix));
    const geometry = mergeGeometries(geometries);
    geometries.forEach((part) => part.dispose());
    if (!geometry) continue;
    const source = parts[0].node;
    const mesh = new Mesh(geometry, source.material);
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.renderOrder = source.renderOrder;
    mesh.layers.mask = source.layers.mask;
    root.add(mesh);
    parts.forEach(({ node }) => { node.visible = false; });
    batches.push({ mesh, parts });
  }

  return () => {
    batches.forEach(({ mesh, parts }) => {
      root.remove(mesh);
      mesh.geometry.dispose();
      parts.forEach(({ node }) => { node.visible = true; });
    });
  };
}
