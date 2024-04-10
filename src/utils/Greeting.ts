/**
 * Returns a greeting message that makes sense for the time of day.
 * @returns A greeting message that makes sense for the time of day.
 */
export default function greeting(): string {
  const date = new Date();
  const hours = date.getHours();
  let content = '';
  if (hours < 3) {
    content = 'Good night';
  } else if (hours < 12) {
    content = 'Good morning';
  } else if (hours < 18) {
    content = 'Good afternoon';
  } else {
    content = 'Good evening';
  }
  return content;
}
