import intervalToDuration from 'date-fns/intervalToDuration';
import { sortProductInstances } from './orderingService';

export const filterByStatus = (products, filter) => {
    let filteredProducts = products;
    if (filter === 'expiring') {
        filteredProducts = products.filter(product => {
            const productExpirationDate = product?.statusExpirationDate ? product.statusExpirationDate : product.expirationDate;
            if (productExpirationDate) {
                const now = new Date().getTime();
                const duration = intervalToDuration({ start: now, end: productExpirationDate });
                return productExpirationDate < now || (duration.days < 3 && duration.years === 0 && duration.months === 0 && duration.years === 0);
            } else return false;
        });
    } else if (filter !== 'all') {
        filteredProducts = products.filter(product => product.status == filter);
    }
    return filteredProducts;
}

export const groupAllProductByCodeAndStatus = (allProducts) => {
    let allGroupedProducts = {};

    if (allProducts.length > 0) {
        allProducts.reduce(function (r, o) {
            var key = o.code + '-' + o.status;
            if (!allGroupedProducts[key]) {
                allGroupedProducts[key] = Object.assign({}, o);
                allGroupedProducts[key].instances = [];
                const instanceExpirationDate = o?.statusExpirationDate ? o.statusExpirationDate : o.expirationDate;
                allGroupedProducts[key].statusExpirationDate = instanceExpirationDate;
                allGroupedProducts[key].expirationDate = instanceExpirationDate;
                allGroupedProducts[key].productUniqueKey = key;
                allGroupedProducts[key].instances.push({
                    id: o.id,
                    expirationDate: o.expirationDate,
                    statusExpirationDate: o.statusExpirationDate,
                    status: o.status
                })
            } else {
                allGroupedProducts[key].quantity += o.quantity;
                const instanceExpirationDate = o?.statusExpirationDate ? o.statusExpirationDate : o.expirationDate;
                //tutta sta merda perchè null è minore di un numero!
                if ((!allGroupedProducts[key].statusExpirationDate && instanceExpirationDate)
                    || (instanceExpirationDate && (instanceExpirationDate < allGroupedProducts[key].statusExpirationDate))) {
                    allGroupedProducts[key].statusExpirationDate = instanceExpirationDate;
                    allGroupedProducts[key].expirationDate = instanceExpirationDate;
                }
                allGroupedProducts[key].instances.push({
                    id: o.id,
                    expirationDate: o.expirationDate,
                    statusExpirationDate: o.statusExpirationDate,
                    status: o.status
                })
            }
            sortProductInstances(allGroupedProducts[key]);
        }, []);
    }
    return allGroupedProducts;
}

