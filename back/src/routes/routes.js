import { Router } from 'express';
import { createCabinet, getCabinets, deleteCabinet, getCabinet, updateCabinet } from '../controllers/Cabinet/CabinetController.js';
import { createUser, deleteUser, getUser, getUsers, login, updateUser } from '../controllers/User/UserController.js';
import { createItem, deleteItem, getItem, getItems, getItemsByName, updateItem } from '../controllers/Item/ItemController.js';
import { createEmployee, deleteEmployee, downloadNewEmployee, getEmployee, getEmployees, updateEmployee } from '../controllers/Employee/EmployeeController.js';
import { getEmployeeCountByCompany, getEmployeeCountByDepartment } from '../controllers/Employee/CountEmployess.js';
import { getEmployeesStartingToday } from '../controllers/Employee/NewEmployess.js';
import { createWithdrawal, getAllWithdrawals, getItemOut, getItensOut, getWithdrawals, getWithdrawalsOut, getWithdrawalsOutPlus, giveItem, returnItem, returnItemAndAddQuantity, updateWithdrawal, getWithdrawalsByItem, deleteItemWithWithdrawals, testAllWithdrawal, deleteAllWithdrawal, getReturnStats } from '../controllers/Item/ItensOut.js';
import { createStockEntry, getStockEntries, getStockEntriesByItem, deleteStockEntry } from '../controllers/Item/StockEntryController.js';
import { createOrder, getOrders, getOrder, updateOrderStatus, receiveOrderItem, deleteOrder } from '../controllers/Item/OrderController.js';
import { getReportByItem, getConsumptionReport, getStockSummary, exportCSV } from '../controllers/Item/ReportController.js';
import { getSuggestions, updateMinStock, updateMinStockBatch } from '../controllers/Item/SuggestionController.js';
import { getAlerts, getAlertByItem, getAlertCount } from '../controllers/Item/AlertController.js';
import { createDiscard, getDiscarded, getDiscardedByItem, getDiscardReport, deleteDiscard } from '../controllers/Item/DiscardController.js';
import { sendToLaundry, returnFromLaundry, getPending, getLaundryHistory, getLaundryRecord } from '../controllers/Item/LaundryController.js';
import { uploadInvoiceMiddleware } from '../config/upload.js';
import { uploadInvoice, getInvoices, downloadInvoice, deleteInvoice, extractInvoiceData } from '../controllers/Invoice/InvoiceController.js';
import { downloadFichaColaborador, downloadFichaColaboradorPDF } from '../controllers/Employee/FichaController.js';
import { processarEmailsDeNotasFiscais } from '../services/emailReaderService.js'



const routes = Router();

async function status(req, res) {
    res.send('API is running');
}

routes.get('/', status);

routes.post('/cabinet', createCabinet);
routes.get('/getcabinets', getCabinets);
routes.get('/cabinet/:number', getCabinet);
routes.put('/cabinet/:number', updateCabinet);
routes.delete('/cabinet/:id', deleteCabinet);

routes.post('/item', createItem)
routes.get('/getitems', getItems);
routes.get('/item/:id', getItem);
routes.put('/item/:id', updateItem);
routes.delete('/item/:id', deleteItem);
routes.get('/getitems/:type', getItems);
routes.get('/getitems/:type/:sector', getItems);
routes.get('/getitemsbyname/:name', getItemsByName);

routes.post('/employee', createEmployee);
routes.get('/getemployees', getEmployees);
routes.get('/employee/:id', getEmployee);
routes.put('/employee/:id', updateEmployee);
routes.delete('/employee/:id', deleteEmployee);
routes.get('/countdepartment/:department', getEmployeeCountByDepartment);
routes.get('/countcompany/:company', getEmployeeCountByCompany);
routes.get('/getemployees/new', getEmployeesStartingToday);
routes.get('/downloadnewemployee/:id', downloadNewEmployee);

routes.post('/user', createUser);
routes.get('/user/:id', getUser);
routes.put('/user/:id', updateUser);
routes.delete('/user/:id', deleteUser);
routes.get('/getusers', getUsers);
routes.post('/login', login);

routes.post('/giveitem', giveItem);
routes.get('/getwithdrawals', getWithdrawals);
routes.get('/getitemsout/:id', getItensOut);
routes.delete('/returnitemandaddquantity/:id', returnItemAndAddQuantity);
routes.delete('/returnitem/:id', returnItem);
routes.get('/getwithdrawalsout', getWithdrawalsOut);
routes.put('/updatewithdrawal/:id', updateWithdrawal);
routes.get('/getitemout/:id', getItemOut);
routes.get('/getwithdrawalsoutplus', getWithdrawalsOutPlus);
routes.get('/getwithdrawalsbyitem/:itemId', getWithdrawalsByItem);
routes.delete('/deleteitemwithwithdrawals/:itemId', deleteItemWithWithdrawals);
routes.get('/testallwithdrawal', testAllWithdrawal);
routes.get('/getallwithdrawals', getAllWithdrawals);
routes.post('/newwithdrawal', createWithdrawal)
routes.delete('/deleteallwithdrawal/:id', deleteAllWithdrawal);
routes.get('/getreturnstats', getReturnStats);


//ROTAS DE ENTRADA DE ESTOQUE
routes.post('/stockentry', createStockEntry);
routes.get('/getstockentries', getStockEntries);
routes.get('/getstockentries/:itemId', getStockEntriesByItem);
routes.delete('/deletestockentry/:id', deleteStockEntry);

//ROTAS DE NOTAS FISCAIS
routes.post('/invoices/upload', uploadInvoiceMiddleware.single('file'), uploadInvoice);
routes.get('/invoices', getInvoices);
routes.get('/invoices/:id/download', downloadInvoice);
routes.delete('/invoices/:id', deleteInvoice);
routes.post('/invoices/extract', uploadInvoiceMiddleware.single('file'), extractInvoiceData);

//ROTAS DE PEDIDOS DE UNIFORMES
routes.post('/order', createOrder);
routes.get('/getorders', getOrders);
routes.get('/getorder/:id', getOrder);
routes.put('/updateorderstatus/:id', updateOrderStatus);
routes.post('/receiveorderitem/:orderItemId', receiveOrderItem);
routes.delete('/deleteorder/:id', deleteOrder);

//ROTAS DE RELATÓRIOS
routes.get('/reports/item/:itemId', getReportByItem);
routes.get('/reports/consumption', getConsumptionReport);
routes.get('/reports/stock-summary', getStockSummary);
routes.get('/reports/export/csv', exportCSV);

//ROTAS DE SUGESTÃO DE PEDIDO
routes.get('/suggestions', getSuggestions);
routes.put('/item/:id/minstock', updateMinStock);
routes.put('/items/minstock/batch', updateMinStockBatch);

//ROTAS DE ALERTAS
routes.get('/alerts', getAlerts);
routes.get('/alerts/item/:itemId', getAlertByItem);
routes.get('/alerts/count', getAlertCount);

//ROTAS DE PEÇAS DESCARTADAS
routes.post('/discard', createDiscard);
routes.get('/getdiscarded', getDiscarded);
routes.get('/getdiscarded/:itemId', getDiscardedByItem);
routes.get('/reports/discards', getDiscardReport);
routes.delete('/deletediscard/:id', deleteDiscard);

//ROTAS DE LAVANDERIA
routes.post('/laundry/send', sendToLaundry);
routes.post('/laundry/return/:id', returnFromLaundry);
routes.get('/laundry/pending', getPending);
routes.get('/laundry/all', getLaundryHistory);
routes.get('/laundry/:id', getLaundryRecord);

//ROTA DE DOWNLOAD DE FICHA DO COLABORADOR
routes.get('/ficha/:id', downloadFichaColaborador);
routes.get('/ficha/:id/pdf', downloadFichaColaboradorPDF);


export default routes;