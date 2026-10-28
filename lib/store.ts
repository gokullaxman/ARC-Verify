import crypto from 'crypto';
import { DocumentRecord, LandRecord, CadastralParcel, AuditLog, User, AIFeedbackRecord, Role, SystemSettings, AppNotification } from '@/types';
import { hashPassword, verifyPassword } from './password';
import { SqliteDatabase } from './sqlite-db';
import { DatabaseService } from './db';
import {
  DEMO_USERS,
  INITIAL_DOCUMENTS,
  INITIAL_LAND_RECORDS,
  INITIAL_PARCELS,
  INITIAL_AUDIT_LOGS,
  INITIAL_AI_FEEDBACK,
  INITIAL_ROLES,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_NOTIFICATIONS,
  ALL_PERMISSIONS
} from './mock-data';

// Server-side / memory store for runtime persistence across API calls
export class StoreManager {
  private users: User[] = [...DEMO_USERS];
  private roles: Role[] = [...INITIAL_ROLES];
  private documents: DocumentRecord[] = [...INITIAL_DOCUMENTS];
  private landRecords: LandRecord[] = [...INITIAL_LAND_RECORDS];
  private parcels: CadastralParcel[] = [...INITIAL_PARCELS];
  private auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
  private aiFeedback: AIFeedbackRecord[] = [...INITIAL_AI_FEEDBACK];
  private systemSettings: SystemSettings = { ...INITIAL_SYSTEM_SETTINGS };
  private notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
  private currentUser: User = DEMO_USERS[0]; // Default to Super Admin

  // System Settings (Confidence Thresholds & Policies)
  getSystemSettings(): SystemSettings {
    return { ...this.systemSettings };
  }

  updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.systemSettings = {
      ...this.systemSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUser.name
    };

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'SYSTEM_SETTINGS_CHANGED',
      details: `System settings updated: Confidence threshold set to ${this.systemSettings.confidenceThreshold}%, Area tolerance set to ${this.systemSettings.areaTolerancePercent}%.`
    });

    return { ...this.systemSettings };
  }

  // Users & Auth
  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: string): User | undefined {
    const user = this.users.find(u => u.id === id);
    if (user && (!user.permissions || user.permissions.length === 0)) {
      const roleObj = this.roles.find(r => r.code === user.role);
      user.permissions = roleObj ? [...roleObj.permissions] : [];
    }
    return user;
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  authenticate(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    if (user.status === 'INACTIVE') return null;
    if (!verifyPassword(password, user.passwordHash)) {
      return null;
    }
    user.lastLogin = new Date().toISOString();
    this.setCurrentUser(user.id);
    this.saveToDisk();
    return user;
  }

  addUser(userData: Partial<User>): User {
    const id = `usr-${Date.now().toString().slice(-5)}`;
    const roleObj = this.roles.find(r => r.code === userData.role) || this.roles[2];
    const newUser: User = {
      id,
      name: userData.name || 'New Officer',
      email: userData.email || `officer-${id}@rev.gov.in`,
      role: userData.role || 'REVENUE_OFFICER',
      designation: userData.designation || 'Land Verification Officer',
      department: userData.department || 'Revenue & Land Records Dept',
      state: userData.state || 'Tamil Nadu',
      district: userData.district || 'Madurai',
      taluk: userData.taluk || 'Madurai North',
      village: userData.village || 'Kovilur',
      employeeId: userData.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
      phone: userData.phone || '+91 98400 00000',
      status: 'ACTIVE',
      passwordHash: userData.passwordHash?.startsWith('scrypt$') ? userData.passwordHash : hashPassword(userData.passwordHash || 'Password@123'),
      permissions: roleObj.permissions,
      lastLogin: new Date().toISOString()
    };

    this.users.unshift(newUser);

    // Update role user count
    roleObj.userCount = (roleObj.userCount || 0) + 1;

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'USER_CREATED',
      details: `Created new user ${newUser.name} (${newUser.email}) with role ${newUser.role} in ${newUser.district}, ${newUser.state}.`
    });

    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const old = this.users[idx];
      this.users[idx] = { ...old, ...updates };

      // If role changed, immediately re-assign permissions for that role
      if (updates.role && updates.role !== old.role) {
        const roleObj = this.roles.find(r => r.code === updates.role);
        if (roleObj) {
          this.users[idx].permissions = [...roleObj.permissions];
        }
      }

      this.addAuditLog({
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userRole: this.currentUser.role,
        action: 'USER_EDITED',
        details: `Updated user profile for ${this.users[idx].name} (${this.users[idx].email}). Role: ${this.users[idx].role}.`
      });

      return this.users[idx];
    }
    return undefined;
  }

  toggleUserStatus(id: string): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'USER_STATUS_TOGGLED',
      details: `User ${user.name} status changed to ${user.status}.`
    });

    return user;
  }

  resetPassword(id: string, newPass: string = 'Password@123'): boolean {
    const user = this.getUserById(id);
    if (!user) return false;
    user.passwordHash = newPass.startsWith('scrypt$') ? newPass : hashPassword(newPass);
    this.saveToDisk();

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'PASSWORD_RESET',
      details: `Password reset by administrator for user ${user.name} (${user.email}).`
    });

    return true;
  }

  deleteUser(id: string): boolean {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const deleted = this.users.splice(idx, 1)[0];
      this.addAuditLog({
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userRole: this.currentUser.role,
        action: 'USER_DELETED',
        details: `Deleted user ${deleted.name} (${deleted.email}).`
      });
      return true;
    }
    return false;
  }

  // Roles & Permissions
  getRoles(): Role[] {
    return [...this.roles];
  }

  getRoleById(id: string): Role | undefined {
    return this.roles.find(r => r.id === id);
  }

  addRole(roleData: Partial<Role>): Role {
    const id = `role-${Date.now().toString().slice(-4)}`;
    const newRole: Role = {
      id,
      name: roleData.name || 'Custom Role',
      code: (roleData.code || 'VIEWER') as any,
      description: roleData.description || 'Custom administrative role',
      userCount: 0,
      createdAt: new Date().toISOString(),
      isSystem: false,
      permissions: roleData.permissions || ['RECORD_VIEW']
    };
    this.roles.push(newRole);

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'ROLE_CREATED',
      details: `Created new role "${newRole.name}" with ${newRole.permissions.length} assigned permissions.`
    });

    return newRole;
  }

  updateRole(id: string, updates: Partial<Role>): Role | undefined {
    const idx = this.roles.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.roles[idx] = { ...this.roles[idx], ...updates };

      // Immediately propagate updated permissions to all active users with this role
      if (updates.permissions) {
        const roleCode = this.roles[idx].code;
        this.users.forEach(u => {
          if (u.role === roleCode) {
            u.permissions = [...updates.permissions!];
          }
        });
      }

      this.addAuditLog({
        userId: this.currentUser.id,
        userName: this.currentUser.name,
        userRole: this.currentUser.role,
        action: 'ROLE_EDITED',
        details: `Updated permissions and details for role "${this.roles[idx].name}". Propagated to active personnel.`
      });

      return this.roles[idx];
    }
    return undefined;
  }

  deleteRole(id: string): boolean {
    const role = this.getRoleById(id);
    if (!role || role.isSystem) return false;
    this.roles = this.roles.filter(r => r.id !== id);

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'ROLE_DELETED',
      details: `Deleted custom role "${role.name}".`
    });

    return true;
  }

  getAllPermissions() {
    return ALL_PERMISSIONS;
  }

  // Notifications
  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  addNotification(notif: Omit<AppNotification, 'id' | 'createdAt'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  markNotificationRead(id: string): boolean {
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      return true;
    }
    return false;
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach(n => { n.read = true; });
  }

  // Current User Session
  getCurrentUser(): User {
    if (this.currentUser && (!this.currentUser.permissions || this.currentUser.permissions.length === 0)) {
      const roleObj = this.roles.find(r => r.code === this.currentUser.role);
      this.currentUser.permissions = roleObj ? [...roleObj.permissions] : [];
    }
    return this.currentUser;
  }

  setCurrentUser(userId: string): User | null {
    const user = this.getUserById(userId);
    if (user) {
      this.currentUser = user;
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGIN',
        details: `User logged in with role ${user.role} (${user.designation}). Jurisdiction: ${user.district}, ${user.state}.`
      });
      return user;
    }
    return null;
  }

  constructor() {
    this.users = this.users.map(u => {
      if (!u.permissions || u.permissions.length === 0) {
        const roleObj = this.roles.find(r => r.code === u.role);
        return {
          ...u,
          permissions: roleObj ? [...roleObj.permissions] : []
        };
      }
      return u;
    });
    this.currentUser = this.users[0];
    this.loadFromDisk();
  }

  private customDbPath?: string;

  public setDatabasePath(dbPath: string): void {
    this.customDbPath = dbPath;
    this.loadFromDisk();
  }

  public reloadFromDatabase(): void {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const dbPath = SqliteDatabase.resolveDbPath(this.customDbPath);
      const data = SqliteDatabase.executeOp(dbPath, 'load_store_state');
      const hasPersistedState =
        (Array.isArray(data.users) && data.users.length > 0) ||
        (Array.isArray(data.legacy_documents) && data.legacy_documents.length > 0);

      if (!hasPersistedState) {
        this.saveToDisk();
        return;
      }

      if (Array.isArray(data.users) && data.users.length > 0) {
        this.users = data.users;
      }
      if (Array.isArray(data.legacy_documents) && data.legacy_documents.length > 0) {
        this.documents = data.legacy_documents;
      }
      if (Array.isArray(data.legacy_records) && data.legacy_records.length > 0) {
        this.landRecords = data.legacy_records;
      }
      if (Array.isArray(data.legacy_audit_logs) && data.legacy_audit_logs.length > 0) {
        this.auditLogs = data.legacy_audit_logs;
      }
      if (Array.isArray(data.ai_feedback) && data.ai_feedback.length > 0) {
        this.aiFeedback = data.ai_feedback;
      }
      if (data.system_settings) {
        this.systemSettings = data.system_settings;
      }
    } catch {
      // Safe fallback
    }
  }

  private saveToDisk(): void {
    try {
      const dbPath = SqliteDatabase.resolveDbPath(this.customDbPath);
      SqliteDatabase.executeOp(dbPath, 'save_store_state', {
        users: this.users,
        documents: this.documents,
        landRecords: this.landRecords,
        auditLogs: this.auditLogs,
        aiFeedback: this.aiFeedback,
        systemSettings: this.systemSettings,
      });
    } catch {
      // Safe fallback
    }
  }

  // Documents with Geographical Access Scoping
  getDocuments(forUser?: User): DocumentRecord[] {
    this.loadFromDisk();
    const user = forUser || this.currentUser;
    let docs = [...this.documents];
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.district && user.district !== 'All Districts' && user.district !== 'State HQ') {
        docs = docs.filter(d => d.district.toLowerCase() === user.district.toLowerCase());
      }
      if (user.taluk && user.taluk !== 'All Taluks') {
        docs = docs.filter(d => d.taluk.toLowerCase() === user.taluk?.toLowerCase());
      }
    }
    return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    let found = this.documents.find(d => d.id === id);
    if (!found) {
      this.loadFromDisk();
      found = this.documents.find(d => d.id === id);
    }
    return found;
  }

  addDocument(doc: DocumentRecord): DocumentRecord {
    this.documents.unshift(doc);
    this.saveToDisk();
    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'DOCUMENT_UPLOADED',
      documentId: doc.id,
      details: `Uploaded document ${doc.fileName} (${doc.documentType}, ${doc.language}) for village ${doc.village}, ${doc.district}.`
    });

    this.addNotification({
      title: 'New Land Document Ingested',
      message: `${doc.fileName} (${doc.documentType}) uploaded for village ${doc.village}, ${doc.district}.`,
      type: 'INFO',
      read: false,
      link: '/documents'
    });

    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    const idx = this.documents.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.documents[idx] = { ...this.documents[idx], ...updates };
      this.saveToDisk();
      return this.documents[idx];
    }
    return undefined;
  }

  // Land Records with Geographical Access Scoping
  getLandRecords(forUser?: User): LandRecord[] {
    this.loadFromDisk();
    const user = forUser || this.currentUser;
    let recs = [...this.landRecords];
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      if (user.district && user.district !== 'All Districts' && user.district !== 'State HQ') {
        recs = recs.filter(r => r.district.value.toLowerCase() === user.district.toLowerCase());
      }
      if (user.taluk && user.taluk !== 'All Taluks') {
        recs = recs.filter(r => r.taluk.value.toLowerCase() === user.taluk?.toLowerCase());
      }
    }
    return recs;
  }

  getLandRecordById(id: string): LandRecord | undefined {
    let found = this.landRecords.find(r => r.id === id);
    if (!found) {
      this.loadFromDisk();
      found = this.landRecords.find(r => r.id === id);
    }
    return found;
  }

  getLandRecordByDocumentId(docId: string): LandRecord | undefined {
    let found = this.landRecords.find(r => r.documentId === docId);
    if (!found) {
      this.loadFromDisk();
      found = this.landRecords.find(r => r.documentId === docId);
    }
    return found;
  }

  addLandRecord(record: LandRecord): LandRecord {
    this.landRecords.unshift(record);
    this.saveToDisk();
    return record;
  }

  updateLandRecord(id: string, updates: Partial<LandRecord>): LandRecord | undefined {
    const idx = this.landRecords.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.landRecords[idx] = {
        ...this.landRecords[idx],
        ...updates,
        lastModified: new Date().toISOString()
      };
      this.saveToDisk();
      return this.landRecords[idx];
    }
    return undefined;
  }

  // Correct Field with AI Feedback & Audit Log
  correctField(
    recordId: string,
    fieldName: string,
    newValue: any,
    officerComment?: string
  ): LandRecord | undefined {
    const record = this.getLandRecordById(recordId);
    if (!record) return undefined;

    const currentField = (record as any)[fieldName];
    if (!currentField) return undefined;

    const previousValue = currentField.value;
    const doc = this.getDocumentById(record.documentId);

    // Update field
    (record as any)[fieldName] = {
      ...currentField,
      value: newValue,
      originalValue: currentField.originalValue ?? previousValue,
      isModified: true,
      confidence: 1.0, // Manual verification guarantees 100% confidence for this field
      explanation: officerComment || 'Manually validated and verified by Revenue Officer.'
    };

    // Calculate new overall confidence
    const fieldConfidenceKeys = [
      'ownerName', 'fatherOrHusbandName', 'surveyNumber', 'subdivisionNumber',
      'khasraNumber', 'village', 'taluk', 'district', 'landArea', 'mutationNumber'
    ];
    let totalConf = 0;
    let count = 0;
    for (const key of fieldConfidenceKeys) {
      if ((record as any)[key]?.confidence) {
        totalConf += (record as any)[key].confidence;
        count++;
      }
    }
    record.overallConfidence = count > 0 ? parseFloat((totalConf / count).toFixed(2)) : 0.95;
    record.lastModified = new Date().toISOString();

    // Store AI learning feedback
    const feedback: AIFeedbackRecord = {
      id: `fb-${Date.now()}`,
      recordId: record.id,
      documentId: record.documentId,
      fieldName,
      originalValue: String(previousValue),
      correctedValue: String(newValue),
      confidence: currentField.confidence,
      documentType: doc?.documentType || 'Other',
      language: doc?.language || 'English',
      officerId: this.currentUser.id,
      timestamp: new Date().toISOString()
    };
    this.aiFeedback.unshift(feedback);

    // Audit Log
    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'FIELD_CORRECTED',
      recordId: record.id,
      documentId: record.documentId,
      fieldName,
      previousValue: String(previousValue),
      newValue: String(newValue),
      details: `Officer corrected field "${fieldName}" from "${previousValue}" to "${newValue}". Logged for model retraining dataset.`
    });

    return record;
  }

  // Verification & Approvals
  verifyRecord(recordId: string, officerName: string): LandRecord | undefined {
    const record = this.getLandRecordById(recordId);
    if (!record) return undefined;

    record.status = 'VERIFIED';
    record.verifiedAt = new Date().toISOString();
    record.verifiedBy = officerName;
    record.lastModified = new Date().toISOString();

    // Also update document status
    this.updateDocument(record.documentId, {
      status: 'VERIFIED'
    });

    // Update associated GIS Parcel if exists
    if (record.gisParcelId) {
      const parcel = this.parcels.find(p => p.id === record.gisParcelId);
      if (parcel) {
        parcel.status = 'VERIFIED';
      }
    }

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: officerName,
      userRole: this.currentUser.role,
      action: 'RECORD_APPROVED',
      recordId: record.id,
      documentId: record.documentId,
      details: `Record ${record.id} (Survey ${record.surveyNumber.value}/${record.subdivisionNumber.value}) formally verified and approved. ULPIN assigned: ${record.ulpin}.`
    });

    return record;
  }

  rejectRecord(recordId: string, reason: string): LandRecord | undefined {
    const record = this.getLandRecordById(recordId);
    if (!record) return undefined;

    record.status = 'REJECTED';
    record.lastModified = new Date().toISOString();

    this.updateDocument(record.documentId, {
      status: 'FAILED'
    });

    this.addAuditLog({
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userRole: this.currentUser.role,
      action: 'RECORD_REJECTED',
      recordId: record.id,
      documentId: record.documentId,
      details: `Record ${record.id} rejected. Reason: ${reason}`
    });

    return record;
  }

  // Parcels
  getParcels(): CadastralParcel[] {
    return [...this.parcels];
  }

  getParcelById(id: string): CadastralParcel | undefined {
    return this.parcels.find(p => p.id === id);
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    this.saveToDisk();
    return log;
  }

  // AI Feedback
  getAIFeedback(): AIFeedbackRecord[] {
    return [...this.aiFeedback];
  }

  // Dashboard Statistics
  getStats() {
    const totalDocs = this.documents.length;
    const processedDocs = this.documents.filter(d => d.status !== 'UPLOADED' && d.status !== 'PROCESSING').length;
    const verifiedRecords = this.landRecords.filter(r => r.status === 'VERIFIED').length;
    const pendingVerification = this.landRecords.filter(r => r.status === 'REQUIRES_VERIFICATION').length;
    const validationFailures = this.landRecords.filter(r => r.validationResult?.overallStatus === 'FAILED').length;
    const duplicatesDetected = this.landRecords.filter(r => r.validationResult?.duplicateCheck.isPotentialDuplicate).length;

    const avgConfidence = this.landRecords.length > 0
      ? (this.landRecords.reduce((acc, curr) => acc + curr.overallConfidence, 0) / this.landRecords.length) * 100
      : 92.5;

    return {
      totalDocuments: totalDocs,
      processedDocuments: processedDocs,
      successfullyDigitized: verifiedRecords,
      pendingVerification,
      validationFailures,
      duplicatesDetected,
      averageConfidence: parseFloat(avgConfidence.toFixed(1)),
      processedToday: 14,
      aiCorrectionsCount: this.aiFeedback.length
    };
  }
}

// Global singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __storeManager: StoreManager | undefined;
}

if (!global.__storeManager) {
  global.__storeManager = new StoreManager();
}
export const dbStore = global.__storeManager;

