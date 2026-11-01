// Static mapping from the Edge keyboard class, corroborated with a captured read.
// Values have not yet been validated by changing settings on hardware.
export function decodeProfile(block) {
  if (!(block instanceof Uint8Array) || block.length < 34) throw new Error('Expected a 34-byte keyboard profile.');
  return {
    selector: block[0],
    brightness: block[2] <= 4 ? block[2] : null,
    effectSpeed: block[3] <= 4 ? 4 - block[3] : null,
    lightingModeCode: block[26],
  };
}
