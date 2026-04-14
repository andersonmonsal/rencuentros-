import { Routes } from '@angular/router';
import { Login } from './fearues/pages/login/login';
import { SignUp } from './fearues/pages/sign-up/sign-up';
import { ForgotPassword } from './fearues/pages/forgot-password/forgot-password';
import { ResetPassword } from './fearues/pages/reset-password/reset-password';
import { Home } from './fearues/pages/home/home';
import { Chats } from './fearues/pages/chats/chats';
import { ChatDetail } from './fearues/pages/chat-detail/chat-detail';
import { Account } from './fearues/pages/account/account';
import { Notifications } from './fearues/pages/notifications/notifications';
import { Search } from './fearues/pages/search/search';
import { Budgets } from './fearues/pages/budgets/budgets';
import { Pockets } from './fearues/pages/pockets/pockets';
import ContributionsComponent from './fearues/pages/contributions/contributions';
import { Costs } from './fearues/pages/costs/costs';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: Login,
    pathMatch: 'full',
  },
  {
    path: 'sign-up',
    component: SignUp,
    pathMatch: 'full',
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
    pathMatch: 'full',
  },
  {
    path: 'reset-password',
    component: ResetPassword,
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: Home,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'chats',
    component: Chats,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'chat-detail/:id',
    component: ChatDetail,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'account',
    component: Account,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'notifications',
    component: Notifications,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'search',
    component: Search,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'budgets',
    component: Budgets,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'budgets/:id',
    component: Budgets,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'pockets',
    component: Pockets,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'pockets/:id',
    component: Pockets,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'contributions',
    component: ContributionsComponent,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'contributions/:id',
    component: ContributionsComponent,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'costs',
    component: Costs,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
  {
    path: 'costs/:id',
    component: Costs,
    pathMatch: 'full',
    canActivate: [authGuard], // Proteger ruta
  },
];
