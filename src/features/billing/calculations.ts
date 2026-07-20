export interface WaterBillBreakdown {
  consumption: number
  consumptionCost: number
  electricityFee: number
  pumpServiceFee: number
  defaultTaxShare: number
  total: number
}

const ELECTRICITY_FEE = 1000
const PUMP_SERVICE_FEE = 2000
const CONSUMPTION_RATE = 700
const DEFAULT_TAX_BASE = 930 // 780 base + 150 surcharge, split across active water tenants

export function computeWaterBill(
  currentReading: number,
  previousReading: number,
  activeWaterTenants: number,
): WaterBillBreakdown {
  const consumption = Math.max(0, currentReading - previousReading)

  if (consumption === 0) {
    const defaultTaxShare =
      activeWaterTenants > 0 ? Math.round(DEFAULT_TAX_BASE / activeWaterTenants) : DEFAULT_TAX_BASE
    return {
      consumption: 0,
      consumptionCost: 0,
      electricityFee: ELECTRICITY_FEE,
      pumpServiceFee: PUMP_SERVICE_FEE,
      defaultTaxShare,
      total: defaultTaxShare + ELECTRICITY_FEE + PUMP_SERVICE_FEE,
    }
  }

  const consumptionCost = consumption * CONSUMPTION_RATE
  return {
    consumption,
    consumptionCost,
    electricityFee: ELECTRICITY_FEE,
    pumpServiceFee: PUMP_SERVICE_FEE,
    defaultTaxShare: 0,
    total: consumptionCost + ELECTRICITY_FEE + PUMP_SERVICE_FEE,
  }
}

export function computeInternetTotal(monthsCount: number): number {
  return 10000 * monthsCount
}

export function computeRentTotal(rate: number, monthsCount: number = 1): number {
  return rate * monthsCount
}

export interface ArrearsBill {
  id: string
  month: number
  year: number
  monthsCount: number
  amount: number
}

export interface ArrearsSummary {
  bills: ArrearsBill[]
  totalMonths: number
  totalAmount: number
}

export function findArrears(
  unpaidBills: ArrearsBill[],
  targetMonth: number,
  targetYear: number,
): ArrearsSummary {
  const prior = unpaidBills
    .filter(b => b.year < targetYear || (b.year === targetYear && b.month < targetMonth))
    .sort((a, b) => a.year - b.year || a.month - b.month)

  return {
    bills: prior,
    totalMonths: prior.reduce((s, b) => s + (b.monthsCount || 1), 0),
    totalAmount: prior.reduce((s, b) => s + b.amount, 0),
  }
}
