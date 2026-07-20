import { describe, it, expect } from 'vitest'
import { computeWaterBill, computeInternetTotal, computeRentTotal, findArrears } from './calculations'

describe('computeWaterBill', () => {
  it('charges consumption at 700/unit plus flat fees when consumption > 0', () => {
    const result = computeWaterBill(120, 100, 5)
    expect(result.consumption).toBe(20)
    expect(result.consumptionCost).toBe(14000)
    expect(result.electricityFee).toBe(1000)
    expect(result.pumpServiceFee).toBe(2000)
    expect(result.defaultTaxShare).toBe(0)
    expect(result.total).toBe(17000)
  })

  it('splits the 930 default tax share across active water tenants when consumption is zero', () => {
    const result = computeWaterBill(100, 100, 3)
    expect(result.consumption).toBe(0)
    expect(result.consumptionCost).toBe(0)
    expect(result.defaultTaxShare).toBe(310) // round(930 / 3)
    expect(result.total).toBe(3310) // 310 + 1000 + 2000
  })

  it('rounds the default tax share when it does not divide evenly', () => {
    const result = computeWaterBill(50, 50, 4)
    expect(result.defaultTaxShare).toBe(233) // round(930 / 4) = round(232.5) = 233
    expect(result.total).toBe(3233)
  })

  it('charges the full 930 when there are no active water tenants', () => {
    const result = computeWaterBill(10, 10, 0)
    expect(result.defaultTaxShare).toBe(930)
    expect(result.total).toBe(3930)
  })

  it('never returns negative consumption when current < previous', () => {
    const result = computeWaterBill(90, 100, 5)
    expect(result.consumption).toBe(0)
    expect(result.defaultTaxShare).toBe(186) // round(930/5)
  })
})

describe('computeInternetTotal', () => {
  it('charges 10,000 per month', () => {
    expect(computeInternetTotal(1)).toBe(10000)
  })

  it('multiplies by monthsCount for consolidated arrears billing', () => {
    expect(computeInternetTotal(3)).toBe(30000)
  })
})

describe('computeRentTotal', () => {
  it('returns the client service rate as-is', () => {
    expect(computeRentTotal(140000)).toBe(140000)
  })
})

describe('findArrears', () => {
  const bills = [
    { id: 'a', month: 3, year: 2026, monthsCount: 1, amount: 10000 },
    { id: 'b', month: 5, year: 2026, monthsCount: 1, amount: 10000 },
    { id: 'c', month: 7, year: 2026, monthsCount: 1, amount: 10000 }, // same month as target — not arrears
    { id: 'd', month: 1, year: 2025, monthsCount: 2, amount: 20000 },
  ]

  it('returns only bills strictly before the target month/year, oldest first', () => {
    const result = findArrears(bills, 7, 2026)
    expect(result.bills.map(b => b.id)).toEqual(['d', 'a', 'b'])
  })

  it('sums monthsCount and amount across the arrears', () => {
    const result = findArrears(bills, 7, 2026)
    expect(result.totalMonths).toBe(4) // 2 + 1 + 1
    expect(result.totalAmount).toBe(40000) // 20000 + 10000 + 10000
  })

  it('returns an empty summary when there are no prior unpaid bills', () => {
    const result = findArrears([], 1, 2026)
    expect(result.bills).toEqual([])
    expect(result.totalMonths).toBe(0)
    expect(result.totalAmount).toBe(0)
  })
})
