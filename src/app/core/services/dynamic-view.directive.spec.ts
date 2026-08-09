import { ViewContainerRef } from '@angular/core';
import { DynamicViewDirective } from './dynamic-view.directive';

describe('DynamicViewDirective', () => {
  it('should create an instance', () => {
    const mockVcr = {} as ViewContainerRef;
    const directive = new DynamicViewDirective(mockVcr);
    expect(directive).toBeTruthy();
  });
});