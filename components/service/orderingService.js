export const sortMapByExpirationDate = (productMap) => {

    return Object.values(productMap).sort((a, b) => {
        const aProductExpirationDate = a?.statusExpirationDate ? a.statusExpirationDate : a.expirationDate;
        const bProductExpirationDate = b?.statusExpirationDate ? b.statusExpirationDate : b.expirationDate;
        if (aProductExpirationDate === bProductExpirationDate) {
            return a.productName < b.productName ? -1 : 1;
        }
        if (!aProductExpirationDate) {
            return 1;
        }
        if (!bProductExpirationDate) {
            return -1;
        }
        return aProductExpirationDate - bProductExpirationDate;
    });
}

export const sortProductInstances = (product) => {
    if (product?.instances) {
        product.instances.sort((a, b) => {
            const aProductExpirationDate = a?.statusExpirationDate ? a.statusExpirationDate : a.expirationDate;
            const bProductExpirationDate = b?.statusExpirationDate ? b.statusExpirationDate : b.expirationDate;
            if (!aProductExpirationDate) {
                return 1;
            }
            if (!bProductExpirationDate) {
                return -1;
            }
            return aProductExpirationDate - bProductExpirationDate
        });
    }
    return product;
}