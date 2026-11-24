/** Collision-resistant local id: time-ordered prefix plus random suffix. */
export function createId(): string {
  const time = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 10; i += 1) rand += Math.floor(Math.random() * 36).toString(36);
  return `${time}${rand}`;
}
