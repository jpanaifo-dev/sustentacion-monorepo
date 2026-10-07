import { api } from '../lib/api';

export interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  global: boolean;
  types: string[];
  source: string;
}

export const holidaysService = {
  async getHolidays(year: number): Promise<PublicHoliday[]> {
    const result = await api.holidays.get(year);
    if (result.error) throw result.error;
    return (result.data ?? []) as PublicHoliday[];
  },
};
