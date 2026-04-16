import { MercadoPagoConfig, Preference, PreApproval } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export const preferenceClient = new Preference(client)
export const preApprovalClient = new PreApproval(client)
export { client as mpClient }
