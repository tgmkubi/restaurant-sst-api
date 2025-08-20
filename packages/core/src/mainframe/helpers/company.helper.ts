import { getTenantModels } from "../database/mongodb/connect";
import { UserRolesEnum } from "../database/interfaces/user";

/**
 * Populate company with its admins from tenant database (OPTIMIZED)
 */
export const populateCompanyAdmins = async (company: any) => {
    try {
        if (!company || !company._id) {
            return company?.toObject ? company.toObject() : company;
        }

        // Get tenant models for this company with timeout
        const tenantModels = await getTenantModels(`COMPANY_${company._id}`);
        
        // Find all admins for this company with optimized query
        const admins = await tenantModels.User.find({
            role: UserRolesEnum.ADMIN,
            companyId: company._id
        })
        .select('_id email firstName lastName role createdAt')
        .lean()
        .limit(20) // Limit to prevent huge responses
        .maxTimeMS(1500); // 1.5 second timeout

        // Convert to plain object and add admins
        const companyObj = company.toObject ? company.toObject() : company;
        companyObj.admins = admins || [];
        companyObj.adminCount = admins?.length || 0;

        return companyObj;
    } catch (error) {
        console.error('Error populating company admins:', error);
        // Return company without admins if there's an error
        const companyObj = company?.toObject ? company.toObject() : company;
        if (companyObj) {
            companyObj.admins = [];
            companyObj.adminCount = 0;
        }
        return companyObj;
    }
};

/**
 * Populate multiple companies with their admins (OPTIMIZED - PARALLEL)
 */
export const populateCompaniesAdmins = async (companies: any[]) => {
    if (!companies || companies.length === 0) {
        return [];
    }

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < companies.length; i += batchSize) {
        const batch = companies.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map(company => populateCompanyAdmins(company))
        );
        
        // Extract successful results
        const successfulResults = batchResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Failed to populate company ${batch[index]?._id}:`, result.reason);
                // Return company without admins
                const companyObj = batch[index]?.toObject ? batch[index].toObject() : batch[index];
                if (companyObj) {
                    companyObj.admins = [];
                    companyObj.adminCount = 0;
                }
                return companyObj;
            }
        });
        
        results.push(...successfulResults);
    }
    
    return results;
};