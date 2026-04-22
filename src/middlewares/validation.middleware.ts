// src/middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

// Type guard to check if it's a FieldValidationError
const isFieldValidationError = (error: ValidationError): error is ValidationError & { path: string; value: any } => {
  return 'path' in error;
};

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array().map((err: ValidationError) => {
        const errorResponse: any = {
          field: isFieldValidationError(err) ? err.path : err.type,
          message: err.msg
        };
        
        // Add value only if it exists
        if (isFieldValidationError(err) && 'value' in err) {
          errorResponse.value = err.value;
        }
        
        return errorResponse;
      })
    });
    return;
  }
  
  next();
};