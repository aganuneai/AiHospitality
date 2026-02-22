import { z } from "zod"

// 1. Guest Schema
export const guestSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["ADULT", "CHILD"]),
    age: z.number().optional(),
    isRepresentative: z.boolean().default(false)
}).refine((data) => {
    if (data.type === "CHILD" && (data.age === undefined || data.age === null)) {
        return false
    }
    return true
}, {
    message: "Age is required for children",
    path: ["age"]
})

// 2. Room Request Schema (Multi-UH)
export const roomRequestSchema = z.object({
    id: z.string().uuid().optional(), // Frontend temp ID
    roomTypeId: z.string().min(1, "Room Type is required"),
    ratePlanId: z.string().min(1, "Rate Plan is required"),
    adults: z.number().min(1, "At least 1 adult is required"),
    children: z.number().min(0).default(0),
    guests: z.array(guestSchema).optional() // Optional for now, but logical validation below
}).refine((data) => {
    // Rule: Critical Occupancy Logic
    if (data.children > 0 && data.adults < 1) {
        return false
    }
    return true
}, {
    message: "A room with children must have at least 1 adult",
    path: ["adults"]
})

// 3. Main Reservation Schema
export const createReservationSchema = z.object({
    // Context
    checkIn: z.string().transform((str) => new Date(str)),
    checkOut: z.string().transform((str) => new Date(str)),

    // Distribution
    channel: z.enum(["DIRECT", "OTA", "OPERATOR", "CORPORATE"]),
    source: z.enum(["PHONE", "WHATSAPP", "WALK_IN", "WEBSITE", "EMAIL"]),
    agencyId: z.string().optional(),
    commission: z.number().min(0).max(100).optional(),

    // Holder
    holderName: z.string().min(3, "Holder name is too short"),
    holderEmail: z.string().email().optional().or(z.literal('')),
    holderPhone: z.string().min(1, "Holder phone is required"),
    holderDoc: z.string().optional(),

    // Rooms
    rooms: z.array(roomRequestSchema).min(1, "At least one room is required"),

    // Quote Context
    quoteId: z.string().optional(), // Flat structure for form
    pricingSignature: z.string().optional(),

    // Payment
    guaranteeType: z.enum(["CC", "PREPAID", "COMPANY", "NONE"]),
    paymentToken: z.string().optional(), // For CC

    // Metadata
    notes: z.string().optional()
}).superRefine((data, ctx) => {
    // Rule: Date Logic
    if (data.checkOut <= data.checkIn) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-out must be after check-in",
            path: ["checkOut"],
        })
    }

    // Rule: Commercial Logic
    if ((data.channel === "OTA" || data.channel === "OPERATOR") && !data.agencyId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Agency is required for OTA/Operator channels",
            path: ["agencyId"],
        })
    }

    // Rule: Guarantee Logic
    if (data.guaranteeType === "CC" && !data.paymentToken) {
        // Checking only if token is missing, in real app would check validity
        // ctx.addIssue({
        //   code: z.ZodIssueCode.custom,
        //   message: "Credit Card token is required",
        //   path: ["paymentToken"],
        // })
    }
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type RoomRequestInput = z.infer<typeof roomRequestSchema>
export type GuestInput = z.infer<typeof guestSchema>
