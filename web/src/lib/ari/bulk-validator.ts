/**
 * Bulk ARI Validator
 * 
 * Validates bulk operation requests before processing.
 */

import { BulkARIOperation, BulkARIRequest } from './bulk-processor';

export interface ValidationError {
    field: string;
    message: string;
    index?: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Validate bulk ARI request
 * 
 * @param request - Bulk operations request
 * @returns Validation result
 */
export function validateBulkARIRequest(request: BulkARIRequest): ValidationResult {
    const errors: ValidationError[] = [];

    // Check operations array exists
    if (!request.operations) {
        errors.push({
            field: 'operations',
            message: 'Operations array is required'
        });
        return { valid: false, errors };
    }

    // Check batch size
    if (!Array.isArray(request.operations)) {
        errors.push({
            field: 'operations',
            message: 'Operations must be an array'
        });
        return { valid: false, errors };
    }

    if (request.operations.length === 0) {
        errors.push({
            field: 'operations',
            message: 'At least one operation is required'
        });
    }

    if (request.operations.length > 500) {
        errors.push({
            field: 'operations',
            message: 'Maximum 500 operations per batch'
        });
    }

    // Validate each operation
    request.operations.forEach((op, index) => {
        const opErrors = validateOperation(op, index);
        errors.push(...opErrors);
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate single operation
 * 
 * @param op - Operation to validate
 * @param index - Operation index in batch
 * @returns Validation errors
 */
function validateOperation(op: BulkARIOperation, index: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields
    if (!op.date) {
        errors.push({
            field: 'date',
            message: 'Date is required',
            index
        });
    } else {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(op.date)) {
            errors.push({
                field: 'date',
                message: 'Invalid date format. Use YYYY-MM-DD',
                index
            });
        } else {
            // Check if valid date
            const date = new Date(op.date);
            if (isNaN(date.getTime())) {
                errors.push({
                    field: 'date',
                    message: 'Invalid date value',
                    index
                });
            }

            // Check if date is not in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                errors.push({
                    field: 'date',
                    message: 'Date cannot be in the past',
                    index
                });
            }
        }
    }

    if (!op.roomTypeCode) {
        errors.push({
            field: 'roomTypeCode',
            message: 'Room type code is required',
            index
        });
    } else {
        // Validate room type code format
        if (op.roomTypeCode.length < 2 || op.roomTypeCode.length > 20) {
            errors.push({
                field: 'roomTypeCode',
                message: 'Room type code must be 2-20 characters',
                index
            });
        }
    }

    // At least one update field must be present
    const hasUpdate =
        op.available !== undefined ||
        op.price !== undefined ||
        op.minLOS !== undefined ||
        op.maxLOS !== undefined ||
        op.closedToArrival !== undefined ||
        op.closedToDeparture !== undefined ||
        op.stopSell !== undefined ||
        op.closed !== undefined;

    if (!hasUpdate) {
        errors.push({
            field: 'operation',
            message: 'At least one update field must be provided',
            index
        });
    }

    // Validate numeric fields
    if (op.available !== undefined) {
        if (!Number.isInteger(op.available) || op.available < 0 || op.available > 1000) {
            errors.push({
                field: 'available',
                message: 'Available must be an integer between 0 and 1000',
                index
            });
        }
    }

    if (op.price !== undefined) {
        if (typeof op.price !== 'number' || op.price < 0 || op.price > 100000) {
            errors.push({
                field: 'price',
                message: 'Price must be a number between 0 and 100000',
                index
            });
        }
    }

    if (op.minLOS !== undefined) {
        if (!Number.isInteger(op.minLOS) || op.minLOS < 1 || op.minLOS > 365) {
            errors.push({
                field: 'minLOS',
                message: 'minLOS must be an integer between 1 and 365',
                index
            });
        }
    }

    if (op.maxLOS !== undefined) {
        if (!Number.isInteger(op.maxLOS) || op.maxLOS < 1 || op.maxLOS > 365) {
            errors.push({
                field: 'maxLOS',
                message: 'maxLOS must be an integer between 1 and 365',
                index
            });
        }
    }

    // Validate minLos <= maxLos
    if (op.minLOS !== undefined && op.maxLOS !== undefined && op.minLOS > op.maxLOS) {
        errors.push({
            field: 'minLOS',
            message: 'minLOS cannot be greater than maxLOS',
            index
        });
    }

    return errors;
}
