import { Router } from 'express';
import { createCabinet, getCabinets, deleteCabinet, getCabinet, updateCabinet } from '../controllers/Cabinet/CabinetController.js';
import { createUser, deleteUser, getUser, getUsers, login, updateUser } from '../controllers/User/UserController.js';
import { createItem, deleteItem, getItem, getItems, getItemsByName, updateItem } from '../controllers/Item/ItemController.js';
import { createEmployee, deleteEmployee, downloadNewEmployee, getEmployee, getEmployees, updateEmployee } from '../controllers/Employee/EmployeeController.js';
import { getEmployeeCountByCompany, getEmployeeCountByDepartment } from '../controllers/Employee/CountEmployess.js';
import { getEmployeesStartingToday } from '../controllers/Employee/NewEmployess.js';
import { createWithdrawal, getAllWithdrawals, getItemOut, getItensOut, getWithdrawals, getWithdrawalsOut, getWithdrawalsOutPlus, giveItem, returnItem, returnItemAndAddQuantity, updateWithdrawal, getWithdrawalsByItem, deleteItemWithWithdrawals, testAllWithdrawal, deleteAllWithdrawal } from '../controllers/Item/ItensOut.js';



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

export default routes;