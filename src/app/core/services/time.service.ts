export class TimeService {
  static nowIso(): string {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ecuadorDate = new Date(utc - (3600000 * 5));

    const pad = (n: number) => n.toString().padStart(2, '0');

    return ecuadorDate.getFullYear() +
      '-' + pad(ecuadorDate.getMonth() + 1) +
      '-' + pad(ecuadorDate.getDate()) +
      'T' + pad(ecuadorDate.getHours()) +
      ':' + pad(ecuadorDate.getMinutes()) +
      ':' + pad(ecuadorDate.getSeconds()) +
      '.000-05:00';
  }
}
